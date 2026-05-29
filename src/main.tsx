import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter as BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import App from '@/App.tsx'
import '@/index.css'

const isWebTarget = import.meta.env.VITE_TARGET === 'web'

async function bootstrap(): Promise<void> {
  if (isWebTarget) {
    const { installWebBridge } = await import('@/platform/web/installWebBridge')
    await installWebBridge()
  } else if (import.meta.env.DEV) {
    await import('@/dev/browserMockBridge')
  }

  const root = document.getElementById('root')
  if (!root) throw new Error('Root element missing')

  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}

void bootstrap()
