import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, readThemePref } from './lib/theme'

// appliqué avant le premier rendu pour éviter un flash de mauvais thème
applyTheme(readThemePref())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
