import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import './light.css'
import { Theme } from '@astryxdesign/core/theme'
import { stoneTheme } from './themes/stone/stoneTheme'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={stoneTheme} mode="light">
      <App />
    </Theme>
  </StrictMode>,
)
