import { Cookie } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useCookieContext } from '@/contexts/CookieContext';

export function CookieConsent() {
    const {
        showConsentBanner,
        acceptAll,
        acceptNecessary,
        setShowPreferencesModal,
    } = useCookieContext();

    if (!showConsentBanner) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="fixed bottom-0 left-0 right-0 z-50 w-full"
            >
                <div className="bg-white/80 backdrop-blur-md border-t border-gray-200 shadow-lg">
                    <div className="container-custom mx-auto px-4 py-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-start gap-3 text-left">
                                <Cookie className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-gray-800">
                                        Nós valorizamos sua privacidade
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Utilizamos cookies para aprimorar sua experiência de navegação, oferecer anúncios ou conteúdo personalizados e analisar nosso tráfego. Ao clicar em "Aceitar", você concorda com nosso uso de cookies.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
                                <Button
                                    onClick={() => setShowPreferencesModal(true)}
                                    variant="outline"
                                    className="flex-1 md:flex-initial"
                                >
                                    Preferências
                                </Button>
                                <Button
                                    onClick={acceptNecessary}
                                    variant="outline"
                                    className="flex-1 md:flex-initial"
                                >
                                    Recusar
                                </Button>
                                <Button
                                    onClick={acceptAll}
                                    className="flex-1 md:flex-initial bg-[#C75D3B] hover:bg-[#A64D31]"
                                >
                                    Aceitar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}