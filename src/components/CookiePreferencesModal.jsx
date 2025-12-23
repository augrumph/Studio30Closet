import { Cookie, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useCookieContext } from '@/contexts/CookieContext';

export function CookiePreferencesModal() {
    const {
        showPreferencesModal,
        setShowPreferencesModal,
        preferences,
        setPreferences,
        saveConsent,
        acceptAll,
        acceptNecessary,
    } = useCookieContext();

    const handleSave = () => {
        saveConsent(preferences);
    };

    const handleCheckboxChange = (category, isChecked) => {
        setPreferences(prev => ({ ...prev, [category]: isChecked }));
    };

    if (!showPreferencesModal) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
                onClick={() => setShowPreferencesModal(false)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Cookie className="w-5 h-5 text-amber-600" />
                                </div>
                                <h3 className="font-display font-semibold text-xl text-[#4A3B32]">
                                    Preferências de Cookies
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowPreferencesModal(false)}
                                className="p-2 rounded-full hover:bg-gray-50 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <p className="text-gray-600 text-sm mb-6">
                            Para lhe proporcionar a melhor experiência, utilizamos tecnologias como cookies para armazenar e/ou aceder a informações do dispositivo. O consentimento para estas tecnologias permitir-nos-á processar dados como o comportamento de navegação ou IDs únicos neste site. Não consentir ou retirar o consentimento pode afetar negativamente certas características e funções.
                        </p>

                        <div className="space-y-4 mb-6">
                            {/* Necessary Cookies */}
                            <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl transition-colors">
                                <input
                                    type="checkbox"
                                    id="necessary-cookies"
                                    checked={preferences.necessary}
                                    className="mt-1 w-5 h-5 text-gray-400 rounded focus:ring-gray-300"
                                    disabled
                                />
                                <label htmlFor="necessary-cookies" className="flex-1 cursor-not-allowed">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-gray-500">Cookies Necessários</span>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Sempre Ativo</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Estes cookies são essenciais para que o website funcione corretamente. Não podem ser desativados nos nossos sistemas.
                                    </p>
                                </label>
                            </div>

                            {/* Analytics Cookies */}
                            <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#C75D3B]/30 transition-colors">
                                <input
                                    type="checkbox"
                                    id="analytics-cookies"
                                    checked={preferences.analytics}
                                    onChange={(e) => handleCheckboxChange('analytics', e.target.checked)}
                                    className="mt-1 w-5 h-5 text-[#C75D3B] rounded focus:ring-[#C75D3B]"
                                />
                                <label htmlFor="analytics-cookies" className="flex-1 cursor-pointer">
                                    <span className="font-medium text-[#4A3B32]">Cookies de Análise</span>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Estes cookies permitem-nos contar visitas e fontes de tráfego, para que possamos medir e melhorar o desempenho do nosso website.
                                    </p>
                                </label>
                            </div>

                            {/* Marketing Cookies */}
                            <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#C75D3B]/30 transition-colors">
                                <input
                                    type="checkbox"
                                    id="marketing-cookies"
                                    checked={preferences.marketing}
                                    onChange={(e) => handleCheckboxChange('marketing', e.target.checked)}
                                    className="mt-1 w-5 h-5 text-[#C75D3B] rounded focus:ring-[#C75D3B]"
                                />
                                <label htmlFor="marketing-cookies" className="flex-1 cursor-pointer">
                                    <span className="font-medium text-[#4A3B32]">Cookies de Marketing</span>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Estes cookies podem ser estabelecidos através do nosso site pelos nossos parceiros de publicidade. Podem ser usados por essas empresas para construir um perfil sobre os seus interesses e mostrar-lhe anúncios relevantes em outros websites.
                                    </p>
                                </label>
                            </div>

                            {/* Preferences Cookies */}
                            <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#C75D3B]/30 transition-colors">
                                <input
                                    type="checkbox"
                                    id="preferences-cookies"
                                    checked={preferences.preferences}
                                    onChange={(e) => handleCheckboxChange('preferences', e.target.checked)}
                                    className="mt-1 w-5 h-5 text-[#C75D3B] rounded focus:ring-[#C75D3B]"
                                />
                                <label htmlFor="preferences-cookies" className="flex-1 cursor-pointer">
                                    <span className="font-medium text-[#4A3B32]">Cookies de Preferências</span>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Estes cookies permitem que o site forneça uma funcionalidade e personalização melhoradas. Podem ser estabelecidos por nós ou por fornecedores externos cujos serviços adicionámos às nossas páginas.
                                    </p>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    onClick={acceptNecessary}
                                    variant="outline"
                                >
                                    Rejeitar Todos
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    variant="outline"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Salvar e Aceitar
                                </Button>
                            </div>
                            <Button
                                onClick={acceptAll}
                                className="bg-[#C75D3B] hover:bg-[#A64D31]"
                            >
                                Aceitar Todos
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}