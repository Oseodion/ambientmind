import { createContext, useContext, useState, useCallback } from 'react'

const ProofContext = createContext(null)

const STORAGE_KEY = 'ambientmind_proofs'
const MAX_PROOFS = 100

function loadProofs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

export function ProofProvider({ children }) {
  const [proofs, setProofs] = useState(loadProofs)

  const persist = useCallback((updated) => {
    const trimmed = updated.slice(0, MAX_PROOFS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    return trimmed
  }, [])

  const addProof = useCallback((proof) => {
    setProofs(prev => {
      if (prev.some(p => p.id === proof.id)) return prev
      const updated = [{ ...proof, id: proof.id || crypto.randomUUID() }, ...prev]
      return persist(updated)
    })
  }, [persist])

  const clearProofs = useCallback(() => {
    setProofs([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <ProofContext.Provider value={{ proofs, addProof, clearProofs }}>
      {children}
    </ProofContext.Provider>
  )
}

export function useProofs() {
  const ctx = useContext(ProofContext)
  if (!ctx) throw new Error('useProofs must be used within ProofProvider')
  return ctx
}
