import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const container = document.getElementById('moca-react-graph-root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App container={container} />
    </StrictMode>,
  )
}
