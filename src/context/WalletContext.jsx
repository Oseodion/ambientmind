import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const WalletContext = createContext(null)

const STORAGE_KEY = 'ambientmind_wallet'

export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && window.solana && window.solana.isPhantom) {
      window.solana.connect({ onlyIfTrusted: true })
        .then(resp => {
          const addr = resp.publicKey.toString()
          setWalletAddress(addr)
          localStorage.setItem(STORAGE_KEY, addr)
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY)
        })
    }
  }, [])

  const connect = useCallback(async () => {
    if (!window.solana || !window.solana.isPhantom) {
      setShowInstallModal(true)
      return null
    }
    setConnecting(true)
    try {
      const resp = await window.solana.connect()
      const addr = resp.publicKey.toString()
      setWalletAddress(addr)
      localStorage.setItem(STORAGE_KEY, addr)
      return addr
    } catch (err) {
      console.error('Wallet connection failed:', err)
      return null
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (window.solana) {
      try { await window.solana.disconnect() } catch {}
    }
    setWalletAddress(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const shortAddress = walletAddress
    ? walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4)
    : null

  return (
    <WalletContext.Provider value={{
      walletAddress,
      shortAddress,
      connecting,
      connect,
      disconnect,
      showInstallModal,
      setShowInstallModal,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
