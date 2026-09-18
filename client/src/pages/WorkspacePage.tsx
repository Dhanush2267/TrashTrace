import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type {
  ImageFileMetadata,
  PipelineStageId,
  DemoScenarioId,
  VisualizationSettings,
  ClassCategoryItem,
  PerClassApRow,
  StageResult,
} from '@/types'
import { formatBytes, isAcceptedImageType } from '@/lib/utils'
import { getStageConfig } from '@/lib/pipelineConfig'
import { getDemoScenario } from '@/demo/scenarios'
import { mlApiService } from '@/services/api'
import { adaptApiResponseToStageResults } from '@/services/resultAdapter'
import { ImageUploader } from '@/components/workspace/ImageUploader'
import { ImageMetadata } from '@/components/workspace/ImageMetadata'
import { WorkspaceToolbar } from '@/components/workspace/WorkspaceToolbar'
import { PipelineNavigation } from '@/components/workspace/PipelineNavigation'
import { StageView } from '@/components/workspace/StageView'
import { StageStatus } from '@/components/workspace/StageStatus'
import { AnalysisPanel } from '@/components/workspace/AnalysisPanel'
import { EvaluationPanel } from '@/components/workspace/EvaluationPanel'
import { RuntimePanel } from '@/components/workspace/RuntimePanel'
import { ClassLegend } from '@/components/workspace/ClassLegend'
import { DemoModeBanner } from '@/components/workspace/DemoModeBanner'
import { VisualizationControls } from '@/components/workspace/VisualizationControls'
import { InstanceInspector } from '@/components/workspace/InstanceInspector'
import { ReviewModePanel } from '@/components/workspace/ReviewModePanel'

export const WorkspacePage: React.FC = () => {
  const [currentImage, setCurrentImage] = useState<ImageFileMetadata | null>(null)
  const [activeStage, setActiveStage] = useState<PipelineStageId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const testStage = params.get('testStage') as PipelineStageId | null
      if (testStage && ['input', 'yolo', 'watershed', 'morphology', 'final'].includes(testStage)) {
        return testStage
      }
    }
    return 'input'
  })

  // Demo Mode state — enabled by default for review
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const mode = params.get('demoMode')
      if (mode === 'false') return false
    }
    return true
  })

  const [currentScenarioId, setCurrentScenarioId] = useState<DemoScenarioId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const sc = params.get('scenario') as DemoScenarioId | null
      if (sc && ['normal', 'touching', 'noisy', 'difficult'].includes(sc)) {
        return sc
      }
    }
    return 'normal'
  })

  // Real inference state
  const [realStageResults, setRealStageResults] = useState<Record<PipelineStageId, StageResult> | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Layer & selection settings
  const [vizSettings, setVizSettings] = useState<VisualizationSettings>({
    showMasks: true,
    showBoundingBoxes: true,
    showLabels: true,
    maskOpacity: 0.4,
    selectedInstanceId: null,
    highlightedClassId: null,
  })

  // Split-View comparison state
  const [isCompareActive, setIsCompareActive] = useState<boolean>(false)

  const [globalError, setGlobalError] = useState<string | null>(null)
  const activeUrlRef = useRef<string | null>(null)

  // Revoke previous object URL on cleanup or change to prevent memory leaks
  const cleanupActiveUrl = useCallback(() => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current)
      activeUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      cleanupActiveUrl()
    }
  }, [cleanupActiveUrl])

  const runRealInference = useCallback(async (file: File) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsProcessing(true)
    setGlobalError(null)

    try {
      const response = await mlApiService.predict(file, { conf: 0.25, postprocess: 'full' }, controller.signal)
      const adapted = adaptApiResponseToStageResults(response)
      setRealStageResults(adapted)
      setIsDemoMode(false)
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return
      }
      console.error('Real inference failed:', err)
      const msg = err.message || 'Model inference failed. Ensure the FastAPI backend is running.'
      setGlobalError(`Backend Error: ${msg}`)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleImageSelected = useCallback(
    (file: File) => {
      setGlobalError(null)
      cleanupActiveUrl()
      setRealStageResults(null)

      const objectUrl = URL.createObjectURL(file)
      activeUrlRef.current = objectUrl

      const img = new Image()
      img.onload = () => {
        const width = img.naturalWidth || 1
        const height = img.naturalHeight || 1
        const aspectRatio = width / height

        const metadata: ImageFileMetadata = {
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          sizeBytes: file.size,
          formattedSize: formatBytes(file.size),
          mimeType: file.type || 'image/jpeg',
          width,
          height,
          aspectRatio,
          previewUrl: objectUrl,
          lastModified: file.lastModified,
          file,
        }

        setCurrentImage(metadata)
        runRealInference(file)
      }

      img.onerror = () => {
        cleanupActiveUrl()
        setGlobalError('Failed to load image. The file may be corrupted.')
      }

      img.src = objectUrl
    },
    [cleanupActiveUrl, runRealInference],
  )

  // Automated testing query parameter loader
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const testMode = params.get('testImage')

    if (testMode === 'landscape') {
      fetch('/test-assets/test_landscape.png')
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'test_landscape.png', { type: 'image/png' })
          handleImageSelected(file)
        })
        .catch(() => {})
    } else if (testMode === 'portrait') {
      fetch('/test-assets/test_portrait.png')
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'test_portrait.png', { type: 'image/png' })
          handleImageSelected(file)
        })
        .catch(() => {})
    } else if (testMode === 'invalid') {
      fetch('/test-assets/invalid_document.txt')
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'invalid_document.txt', { type: 'text/plain' })
          if (!isAcceptedImageType(file)) {
            setGlobalError('Unsupported format. Please upload a JPG, PNG, or WebP image.')
          } else {
            handleImageSelected(file)
          }
        })
        .catch(() => {})
    }
  }, [handleImageSelected])

  const handleRemoveImage = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    cleanupActiveUrl()
    setCurrentImage(null)
    setRealStageResults(null)
    setActiveStage('input')
    setIsCompareActive(false)
    setVizSettings((prev) => ({ ...prev, selectedInstanceId: null, highlightedClassId: null }))
    setGlobalError(null)
  }, [cleanupActiveUrl])

  // Resolve active demo scenario and stage results
  const currentScenario = useMemo(() => getDemoScenario(currentScenarioId), [currentScenarioId])

  const activeStageConfig = getStageConfig(activeStage)

  const currentStageResult = useMemo(() => {
    if (isDemoMode) {
      return currentScenario.stageResults[activeStage]
    }
    return realStageResults ? realStageResults[activeStage] : undefined
  }, [isDemoMode, currentScenario, activeStage, realStageResults])

  // Upstream result for stage comparison
  const { beforeResult, beforeLabel, afterLabel, canCompare } = useMemo(() => {
    const stageSource = isDemoMode ? currentScenario.stageResults : realStageResults
    if (!stageSource) {
      return { beforeResult: undefined, beforeLabel: '', afterLabel: '', canCompare: false }
    }

    if (activeStage === 'watershed') {
      return {
        beforeResult: stageSource.yolo,
        beforeLabel: 'YOLO (Raw)',
        afterLabel: 'Watershed (Separated)',
        canCompare: true,
      }
    }
    if (activeStage === 'morphology') {
      return {
        beforeResult: stageSource.yolo,
        beforeLabel: 'YOLO (Raw)',
        afterLabel: 'Morphology (Clean)',
        canCompare: true,
      }
    }
    if (activeStage === 'final') {
      return {
        beforeResult: stageSource.yolo,
        beforeLabel: 'YOLO (Initial)',
        afterLabel: 'Final Result',
        canCompare: true,
      }
    }

    return { beforeResult: undefined, beforeLabel: '', afterLabel: '', canCompare: false }
  }, [isDemoMode, currentScenario, realStageResults, activeStage])

  // Extract dynamic class legend from current stage instances
  const dynamicCategories: ClassCategoryItem[] = useMemo(() => {
    if (!currentStageResult || currentStageResult.instances.length === 0) return []
    const map = new Map<string, ClassCategoryItem>()

    for (const inst of currentStageResult.instances) {
      if (!map.has(inst.classId)) {
        map.set(inst.classId, {
          id: inst.classId,
          name: inst.className,
          colorHex: inst.colorHex,
          count: 1,
        })
      } else {
        const item = map.get(inst.classId)!
        item.count = (item.count || 0) + 1
      }
    }

    return Array.from(map.values())
  }, [currentStageResult])

  // Build per-class AP rows from current stage (all dashes in demo fixture)
  const perClassRows: PerClassApRow[] = useMemo(() => {
    if (!currentStageResult) return []
    if (currentStageResult.perClassAp) return currentStageResult.perClassAp

    // Auto-generate rows from detected class categories (all AP = null until model run)
    return dynamicCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      colorHex: cat.colorHex,
      instances: cat.count ?? null,
      ap: null,
    }))
  }, [currentStageResult, dynamicCategories])

  // Resolve currently selected instance
  const selectedInstance = useMemo(() => {
    if (!currentStageResult || !vizSettings.selectedInstanceId) return null
    return (
      currentStageResult.instances.find((i) => i.instanceId === vizSettings.selectedInstanceId) ||
      null
    )
  }, [currentStageResult, vizSettings.selectedInstanceId])

  const handleUpdateVizSettings = (updates: Partial<VisualizationSettings>) => {
    setVizSettings((prev) => ({ ...prev, ...updates }))
  }

  const handleSelectScenario = useCallback((id: DemoScenarioId) => {
    setCurrentScenarioId(id)
    setVizSettings((prev) => ({ ...prev, selectedInstanceId: null }))
    setIsCompareActive(false)
  }, [])

  const handleSelectStage = useCallback((stage: PipelineStageId) => {
    setActiveStage(stage)
    setIsCompareActive(false)
    setVizSettings((prev) => ({ ...prev, selectedInstanceId: null }))
  }, [])

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 gap-6">
      {/* Workspace Header */}
      <section className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              Segmentation Workspace
            </h1>
            <p className="mt-1 text-sm sm:text-base text-[#6B7280]">
              Input → YOLO → Watershed → Morphology → Final
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[#6B7280]">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#E5E7EB] shadow-xs"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${currentImage ? 'bg-[#16A34A]' : 'bg-[#D97706]'}`}
                aria-hidden="true"
              />
              {currentImage ? `Stage: ${activeStageConfig.label}` : 'Awaiting Input'}
            </span>
          </div>
        </div>
      </section>

      {/* Global Error Notice */}
      {globalError && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between text-xs text-[#DC2626]"
        >
          <span className="font-medium">{globalError}</span>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Real Inference Processing Notice */}
      {isProcessing && (
        <div
          role="status"
          className="px-4 py-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center gap-3 text-xs text-[#1E40AF] animate-pulse"
        >
          <span className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="font-medium">
            Running YOLO26n-Seg deep learning model &amp; selective post-processing pipeline...
          </span>
        </div>
      )}

      {/* Main Workspace */}
      {!currentImage ? (
        /* Empty State */
        <div className="flex flex-col gap-6">
          <ImageUploader onImageSelected={handleImageSelected} />

          {/* Feature overview cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#6B7280] uppercase tracking-wider">
                  Vision Pipeline
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827]">Multi-Stage Architecture</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Seamless progression through YOLO raw masks, Watershed instance separation, and Morphological contour cleaning.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#6B7280] uppercase tracking-wider">
                  Visualization
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827]">Interactive Overlay &amp; Split View</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                SVG polygon masks, bounding boxes, confidence chips, and before/after stage comparison.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#6B7280] uppercase tracking-wider">
                  Evaluation
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827]">Benchmark-Ready Metrics</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                mAP50-95, AP50, AP75, Precision, Recall, and per-class performance table — ready for trained model results.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Populated Workspace */
        <div className="flex flex-col gap-4">
          {/* 1. Demo Mode Banner & Scenario Switcher */}
          <DemoModeBanner
            isDemoMode={isDemoMode}
            onToggleDemoMode={() => {
              setIsDemoMode((prev) => {
                const next = !prev
                if (!next && !realStageResults && currentImage?.file) {
                  runRealInference(currentImage.file)
                }
                return next
              })
            }}
            currentScenarioId={currentScenarioId}
            onSelectScenario={handleSelectScenario}
          />

          {/* 2. Pipeline Navigation Stepper */}
          <PipelineNavigation
            activeStage={activeStage}
            onSelectStage={handleSelectStage}
            hasImage={Boolean(currentImage)}
            isDemoMode={isDemoMode}
            hasRealResults={Boolean(realStageResults)}
          />

          {/* 3. Action Toolbar */}
          <WorkspaceToolbar
            hasImage={Boolean(currentImage)}
            activeStageLabel={activeStageConfig.title}
            onReplaceImage={handleImageSelected}
            onRemoveImage={handleRemoveImage}
            onValidationError={setGlobalError}
          />

          {/* 4. Visualization Controls */}
          <VisualizationControls
            settings={vizSettings}
            onUpdateSettings={handleUpdateVizSettings}
            isCompareActive={isCompareActive}
            onToggleCompare={() => setIsCompareActive((prev) => !prev)}
            canCompare={canCompare}
          />

          {/* 5. Workspace Body: Main Viewport (3/4) + Sidebar (1/4) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Primary Viewport Area */}
            <div className="lg:col-span-3 w-full flex flex-col gap-4">
              <StageStatus
                stageId={activeStage}
                isDemoMode={isDemoMode}
                instanceCount={currentStageResult?.instances.length || 0}
              />

              <StageView
                image={currentImage}
                stageId={activeStage}
                stageResult={currentStageResult}
                settings={vizSettings}
                onSelectInstance={(id) => handleUpdateVizSettings({ selectedInstanceId: id })}
                isCompareActive={isCompareActive}
                beforeResult={beforeResult}
                beforeLabel={beforeLabel}
                afterLabel={afterLabel}
                onCloseCompare={() => setIsCompareActive(false)}
              />

              {/* Review Guide — beneath main image, collapsible */}
              <ReviewModePanel
                activeStage={activeStage}
                currentScenarioId={currentScenarioId}
                onSelectStage={handleSelectStage}
                onSelectScenario={handleSelectScenario}
              />
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1 w-full flex flex-col gap-4">
              {/* Selected Instance Inspector */}
              {selectedInstance && (
                <InstanceInspector
                  instance={selectedInstance}
                  isDemoFixture={Boolean(currentStageResult?.isDemoFixture)}
                  onClose={() => handleUpdateVizSettings({ selectedInstanceId: null })}
                />
              )}

              {/* Stage Telemetry */}
              <AnalysisPanel
                metrics={currentStageResult?.telemetry}
                stageTitle={activeStageConfig.title}
                isDemoFixture={Boolean(currentStageResult?.isDemoFixture)}
              />

              {/* Class Legend & Breakdown */}
              <ClassLegend
                categories={dynamicCategories}
                highlightedClassId={vizSettings.highlightedClassId}
                onToggleClass={(classId) => handleUpdateVizSettings({ highlightedClassId: classId })}
              />

              {/* Evaluation Metrics */}
              <EvaluationPanel
                metrics={currentStageResult?.evaluationMetrics}
                classRows={perClassRows}
                isDemoFixture={Boolean(currentStageResult?.isDemoFixture)}
              />

              {/* Runtime & Model Info */}
              <RuntimePanel
                info={currentStageResult?.runtimeInfo}
                isDemoFixture={Boolean(currentStageResult?.isDemoFixture)}
              />

              {/* Image Specifications */}
              <ImageMetadata image={currentImage} />
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
