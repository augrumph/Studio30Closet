import { createContext, useContext, useState } from 'react'

const CookieContext = createContext()

export function CookieProvider({ children }) {
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)

  const value = {
    showPreferencesModal,
    setShowPreferencesModal
  }

  return (
    <CookieContext.Provider value={value}>
      {children}
    </CookieContext.Provider>
  )
}

export function useCookieContext() {
  const context = useContext(CookieContext)
  if (!context) {
    throw new Error('useCookieContext must be used within a CookieProvider')
  }
  return context
}