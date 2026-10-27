import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Real.tsx'
import { registerSW } from 'virtual:pwa-register'

// Quan hi ha una versió nova, s'instal·la i la pàgina es recarrega sola.
// Es comprova cada cop que es torna a l'app i cada hora, perquè les apps instal·lades no es tanquen mai del tot.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}) }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
    setInterval(check, 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
