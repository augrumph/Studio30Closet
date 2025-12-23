import { useState, useEffect } from 'react'
import { Cookie, Shield, Settings, X, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'

export function CookiePreferencesModal({ isOpen, onClose }) {
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  })

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (consent) {
      setPreferences(JSON.parse(consent))
    }
  }, [isOpen])

  const handleSave = () => {
    const consentData = {
      ...preferences,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('cookie-consent', JSON.stringify(consentData))
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-display font-semibold text-xl text-[#4A3B32]">
                  Preferências de Cookies
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#C75D3B]/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.necessary}
                  onChange={(e) => setPreferences(prev => ({ ...prev, necessary: e.target.checked }))}
                  className="mt-1 w-5 h-5 text-[#C75D3B] rounded focus:ring-[#C75D3B]"
                  disabled
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[#4A3B32]">Cookies Necessários</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Obrigatório</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Essenciais para o funcionamento do site. Não podem ser desativados.
                  </p>
                  <div className="mt-3">
                    <h4 className="font-medium text-sm text-[#4A3B32] mb-2">Exemplos:</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Autenticação e sessão</li>
                      <li>• Carrinho de compras</li>
                      <li>• Segurança básica</li>
                      <li>• Preferências de idioma</li>
                    </ul>
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#C75D3B]/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                  className="mt-1 w-5 h-5 text-[#C75D3B] rounded focus:ring-[#C75D3B]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[#4A3B32]">Cookies de Análise</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Nos ajudam a entender como os visitantes interagem com nosso site.
                  </p>
                  <div className="mt-3">
                    <h4 className="font-medium text-sm text-[#4A3B32] mb-2">Exemplos:</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Google Analytics</li>
                      <li>• Desempenho do site</li>
                      <li>• Páginas mais visitadas</li>
                      <li>• Tempo de permanência</li>
                    </ul>
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#C75D3B]/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                  className="mt-1 w-5 h-5 text-[#C75D3B] rounded focus:ring-[#C75D3B]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[#4A3B32]">Cookies de Marketing</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Usados para personalizar anúncios e conteúdo relevante.
                  </p>
                  <div className="mt-3">
                    <h4 className="font-medium text-sm text-[#4A3B32] mb-2">Exemplos:</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Anúncios personalizados</li>
                      <li>• Retargeting</li>
                      <li>• Performance de campanhas</li>
                      <li>• Recomendações de produtos</li>
                    </ul>
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#C75D3B]/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.preferences}
                  onChange={(e) => setPreferences(prev => ({ ...prev, preferences: e.target.checked }))}
                  className="mt-1 w-5 h-5 text-[#C75D3B] rounded focus:ring-[#C75D3B]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[#4A3B32]">Cookies de Preferências</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Lembram suas preferências para uma experiência personalizada.
                  </p>
                  <div className="mt-3">
                    <h4 className="font-medium text-sm text-[#4A3B32] mb-2">Exemplos:</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Idioma preferido</li>
                      <li>• Moeda</li>
                      <li>• Layout personalizado</li>
                      <li>• Lembretes de carrinho</li>
                    </ul>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-[#C75D3B] hover:bg-[#A64D31]"
              >
                <Check className="w-4 h-4 mr-2" />
                Salvar Preferências
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}