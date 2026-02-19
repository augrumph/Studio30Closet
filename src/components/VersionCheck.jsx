import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function VersionCheck() {
    const [lastVersion, setLastVersion] = useState(null);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Add timestamp to avoid browser caching of the json file itself
                const response = await fetch('/version.json?t=' + new Date().getTime());
                if (!response.ok) return;

                const data = await response.json();
                const currentVersion = data.version;

                // Load saved version from local storage
                const savedVersion = localStorage.getItem('app_version');

                if (savedVersion && savedVersion !== currentVersion) {
                    console.log(`🔄 New version available: ${currentVersion} (Current: ${savedVersion})`);

                    toast.info('Nova atualização disponível!', {
                        description: 'O sistema foi atualizado. Clique para carregar as novidades.',
                        duration: Infinity,
                        action: {
                            label: 'Atualizar Agora',
                            onClick: () => {
                                localStorage.setItem('app_version', currentVersion);
                                window.location.reload(true);
                            }
                        }
                    });
                } else if (!savedVersion) {
                    // First load, just save it
                    localStorage.setItem('app_version', currentVersion);
                }

                setLastVersion(currentVersion);

            } catch (error) {
                console.error('Error checking version:', error);
            }
        };

        // Check immediately
        checkVersion();

        // Check on focus (when user comes back to tab)
        window.addEventListener('focus', checkVersion);

        // Check every 5 minutes
        const interval = setInterval(checkVersion, 5 * 60 * 1000);

        return () => {
            window.removeEventListener('focus', checkVersion);
            clearInterval(interval);
        };
    }, []);

    return null; // Logic only component
}
