import { createContext, useContext, useState, useCallback } from 'react'

const MissionContext = createContext(null)

const STORAGE_KEY = 'ambientmind_missions'
const MAX_MISSIONS = 50

function loadMissions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

export function MissionProvider({ children }) {
  const [missions, setMissions] = useState(loadMissions)

  const addMission = useCallback((mission) => {
    setMissions(prev => {
      const id = mission.id || crypto.randomUUID()
      if (prev.some(m => m.id === id)) return prev
      const updated = [{ ...mission, id }, ...prev]
      const trimmed = updated.slice(0, MAX_MISSIONS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
      return trimmed
    })
  }, [])

  return (
    <MissionContext.Provider value={{ missions, addMission }}>
      {children}
    </MissionContext.Provider>
  )
}

export function useMissions() {
  const ctx = useContext(MissionContext)
  if (!ctx) throw new Error('useMissions must be used within MissionProvider')
  return ctx
}
