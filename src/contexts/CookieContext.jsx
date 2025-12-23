import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CookieContext = createContext();

const INITIAL_PREFERENCES = {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
};

export function CookieProvider({ children }) {
    const [showConsentBanner, setShowConsentBanner] = useState(false);
    const [showPreferencesModal, setShowPreferencesModal] = useState(false);
    const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);

    useEffect(() => {
        try {
            const storedConsent = localStorage.getItem('cookie-consent');
            if (storedConsent) {
                setPreferences(JSON.parse(storedConsent));
                setShowConsentBanner(false);
            } else {
                setShowConsentBanner(true);
            }
        } catch (error) {
            console.error("Failed to parse cookie consent from localStorage", error);
            setShowConsentBanner(true);
        }
    }, []);

    const saveConsent = useCallback((newPreferences) => {
        const consentData = {
            ...newPreferences,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem('cookie-consent', JSON.stringify(consentData));
        setPreferences(newPreferences);
        setShowConsentBanner(false);
        setShowPreferencesModal(false);
    }, []);

    const acceptAll = useCallback(() => {
        saveConsent({
            necessary: true,
            analytics: true,
            marketing: true,
            preferences: true,
        });
    }, [saveConsent]);

    const acceptNecessary = useCallback(() => {
        saveConsent({
            necessary: true,
            analytics: false,
            marketing: false,
            preferences: false,
        });
    }, [saveConsent]);

    const value = {
        showConsentBanner,
        showPreferencesModal,
        setShowPreferencesModal,
        preferences,
        setPreferences,
        acceptAll,
        acceptNecessary,
        saveConsent,
    };

    return (
        <CookieContext.Provider value={value}>
            {children}
        </CookieContext.Provider>
    );
}

export function useCookieContext() {
    const context = useContext(CookieContext);
    if (!context) {
        throw new Error('useCookieContext must be used within a CookieProvider');
    }
    return context;
}