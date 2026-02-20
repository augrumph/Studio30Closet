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

                    // Check if user is on a protected route (form/edit)
                    const isFormRoute = window.location.pathname.includes('/new') ||
                        window.location.pathname.includes('/edit') ||
                        window.location.pathname.match(/\/admin\/products\/\d+/);

                    if (isFormRoute) {
                        console.log('⏳ Update pending: User is on a form route. Waiting for navigation/idle.');
                        return;
                    }

                    // Perform silent update after short delay of idleness OR when tab is hidden
                    let updateTimeout;

                    const performUpdate = () => {
                        console.log('🚀 Performing automatic update...');
                        localStorage.setItem('app_version', currentVersion);
                        window.location.reload(true);
                    };

                    const handleVisibilityChange = () => {
                        if (document.hidden) performUpdate();
                    };

                    // Update when tab is hidden (most non-disruptive)
                    document.addEventListener('visibilitychange', handleVisibilityChange);

                    // Or update after 2 minutes even if visible, if not on a form
                    updateTimeout = setTimeout(performUpdate, 2 * 60 * 1000);

                    return () => {
                        document.removeEventListener('visibilitychange', handleVisibilityChange);
                        clearTimeout(updateTimeout);
                    };
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
