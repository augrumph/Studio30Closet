import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CookieConsent } from '@/components/CookieConsent';
import { CookiePreferencesModal } from '@/components/CookiePreferencesModal';

export function Layout() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 pt-20 sm:pt-24">
                <Outlet />
            </main>
            <Footer />
            <CookieConsent />
            <CookiePreferencesModal />
        </div>
    );
}
