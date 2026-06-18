import { Navigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'

export default function ProtectedRoute({ children }) {
  const { walletAddress } = useWallet()
  if (!walletAddress) return <Navigate to="/" replace />
  return children
}
