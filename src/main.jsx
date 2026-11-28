import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ConfirmProvider } from './context/ConfirmContext.jsx'
import { applyTheme, readThemePref } from './lib/theme'

// appliqué avant le premier rendu pour éviter un flash de mauvais thème
applyTheme(readThemePref())
// en mode "système", suit le changement clair / sombre du système sans recharger la page
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (readThemePref() === 'system') applyTheme('system')
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </LanguageProvider>
    <Analytics />
  </StrictMode>,
)
