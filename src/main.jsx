import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setSite, snapshotDoc } from './data/site'
import { useNavigationStore } from './store/navigationStore'
import { initTheme } from './store/themeStore'

// How long to wait for the live content before showing the bundled snapshot
const SITE_TIMEOUT_MS = 5000

// The site's content from /api/site. index.html starts the request while this
// code downloads; falls back to the snapshot if it fails or stalls.
async function loadSite() {
  const request = window.__site ?? fetch('/api/site').then(r => (r.ok ? r.json() : null))
  const timeout = new Promise(resolve => setTimeout(resolve, SITE_TIMEOUT_MS, null))
  const live = await Promise.race([request, timeout]).catch(() => null)
  return live?.version ? live : snapshotDoc()
}

const root = createRoot(document.getElementById('root'))

if (/^\/crm(\/|$)/.test(window.location.pathname)) {
  // The site editor, in its own chunk so visitors never download it
  document.documentElement.classList.add('crm')
  const { default: CrmApp } = await import('./crm/CrmApp.jsx')
  root.render(
    <StrictMode>
      <CrmApp />
    </StrictMode>,
  )
} else {
  initTheme()
  setSite(await loadSite())
  useNavigationStore.getState().initFromUrl()
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
