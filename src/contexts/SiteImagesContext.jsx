import { createContext, useContext } from 'react'
import { useSiteImages } from '@/hooks/useSiteImages'

const SiteImagesContext = createContext(null)

export function SiteImagesProvider({ children }) {
  const siteImages = useSiteImages()

  return (
    <SiteImagesContext.Provider value={siteImages}>
      {children}
    </SiteImagesContext.Provider>
  )
}

export function useSiteImagesContext() {
  const context = useContext(SiteImagesContext)
  if (!context) {
    throw new Error('useSiteImagesContext deve ser usado dentro de SiteImagesProvider')
  }
  return context
}
