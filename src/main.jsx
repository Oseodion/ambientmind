import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import { ProofProvider } from './context/ProofContext'
import { MissionProvider } from './context/MissionContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <ProofProvider>
          <MissionProvider>
            <App />
          </MissionProvider>
        </ProofProvider>
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>,
)
