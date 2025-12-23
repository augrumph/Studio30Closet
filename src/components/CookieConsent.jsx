import { useState, useEffect } from 'react'
import { Cookie, Shield, Settings, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'

export function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  })

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setShowConsent(true)
    } else {
      const consentData = JSON.parse(consent)
      setPreferences(consentData)
    }
  }, [])

  const handleAcceptAll = () => {
    const consentData = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('cookie-consent', JSON.stringify(consentData))
    setShowConsent(false)
  }

  const handleAcceptNecessary = () => {
    const consentData = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('cookie-consent', JSON.stringify(consentData))
    setShowConsent(false)
  }

  const handleSavePreferences = () => {
    const consentData = {
      ...preferences,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('cookie-consent', JSON.stringify(consentData))
    setShowConsent(false)
  }

  const handleManagePreferences = () => {
    setShowConsent(true)
  }

  if (!showConsent) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 relative">
          <button
            onClick={() => setShowConsent(false)}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Cookie className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[#4A3B32] text-lg">
                Nossos Cookies
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Usamos cookies para melhorar sua experiência e analisar nosso tráfego.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.necessary}
                onChange={(e) => setPreferences(prev => ({ ...prev, necessary: e.target.checked }))}
                className="mt-1"
                disabled
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#4A3B32]">Cookies Necessários</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Obrigatório</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Essenciais para o funcionamento do site. Não podem ser desativados.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-[#4A3B32]">Cookies de Análise</div>
                <p className="text-xs text-gray-500 mt-1">
                  Nos ajudam a entender como os visitantes interagem com nosso site.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-[#4A3B32]">Cookies de Marketing</div>
                <p className="text-xs text-gray-500 mt-1">
                  Usados para personalizar anúncios e conteúdo relevante.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.preferences}
                onChange={(e) => setPreferences(prev => ({ ...prev, preferences: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-[#4A3B32]">Cookies de Preferências</div>
                <p className="text-xs text-gray-500 mt-1">
                  Lembram suas preferências para uma experiência personalizada.
                </p>
              </div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleAcceptNecessary}
              variant="outline"
              className="flex-1 text-sm"
            >
              Aceitar Necessários
            </Button>
            <Button
              onClick={handleSavePreferences}
              className="flex-1 text-sm bg-[#C75D3B] hover:bg-[#A64D31]"
            >
              Salvar Preferências
            </Button>
            <Button
              onClick={handleAcceptAll}
              variant="secondary"
              className="flex-1 text-sm"
            >
              Aceitar Todos
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}