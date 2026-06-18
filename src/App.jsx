import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ConsolePage from './pages/ConsolePage'
import AgentNetworkPage from './pages/AgentNetworkPage'
import ProofReceiptsPage from './pages/ProofReceiptsPage'
import MissionHistoryPage from './pages/MissionHistoryPage'
import ProtectedRoute from './components/ProtectedRoute'
import InstallPhantomModal from './components/InstallPhantomModal'

function App() {
  return (
    <>
      <InstallPhantomModal />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/console" element={<ProtectedRoute><ConsolePage /></ProtectedRoute>} />
        <Route path="/agents" element={<ProtectedRoute><AgentNetworkPage /></ProtectedRoute>} />
        <Route path="/proofs" element={<ProtectedRoute><ProofReceiptsPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><MissionHistoryPage /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

export default App
