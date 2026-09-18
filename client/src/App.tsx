import React from 'react'
import { RootLayout } from '@/layouts/RootLayout'
import { WorkspacePage } from '@/pages/WorkspacePage'

export const App: React.FC = () => {
  return (
    <RootLayout>
      <WorkspacePage />
    </RootLayout>
  )
}

export default App
