import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const MissionContext = createContext(null)

const STORAGE_KEY = 'ambientmind_missions'
const MAX_MISSIONS = 50

export function MissionProvider({ children }) {
  const [missions, setMissions] = useState([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setMissions(JSON.parse(stored))
    } catch {}
  }, [])

  const addMission = useCallback((mission) => {
    setMissions(prev => {
      const updated = [{ ...mission, id: mission.id || crypto.randomUUID() }, ...prev]
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
