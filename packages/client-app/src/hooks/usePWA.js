import { useState, useEffect, useCallback } from 'react';
export const usePWA = () => {
    const [pwaState, setPwaState] = useState({
        showInstallPrompt: false,
        showUpdateNotification: false,
        deferredPrompt: null,
        updateAvailable: false,
    });
    useEffect(() => {
        // Handle install prompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setPwaState(prev => ({
                ...prev,
                deferredPrompt: e,
                showInstallPrompt: true,
            }));
        };
        // Handle app installed
        const handleAppInstalled = () => {
            setPwaState(prev => ({
                ...prev,
                showInstallPrompt: false,
                deferredPrompt: null,
            }));
        };
        // Handle service worker updates
        const handleServiceWorkerUpdate = () => {
            setPwaState(prev => ({
                ...prev,
                showUpdateNotification: true,
                updateAvailable: true,
            }));
        };
        // Add event listeners
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
        // Listen for service worker updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', handleServiceWorkerUpdate);
        }
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('controllerchange', handleServiceWorkerUpdate);
            }
        };
    }, []);
    // Install PWA
    const installPWA = useCallback(async () => {
        if (pwaState.deferredPrompt) {
            pwaState.deferredPrompt.prompt();
            const { outcome } = await pwaState.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setPwaState(prev => ({
                    ...prev,
                    showInstallPrompt: false,
                    deferredPrompt: null,
                }));
            }
        }
    }, [pwaState.deferredPrompt]);
    // Update PWA
    const updatePWA = useCallback(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((registration) => {
                if (registration && registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        }
        setPwaState(prev => ({
            ...prev,
            showUpdateNotification: false,
            updateAvailable: false,
        }));
        // Reload the page to apply the update
        window.location.reload();
    }, []);
    // Dismiss install prompt
    const dismissInstallPrompt = useCallback(() => {
        setPwaState(prev => ({
            ...prev,
            showInstallPrompt: false,
        }));
    }, []);
    // Dismiss update notification
    const dismissUpdateNotification = useCallback(() => {
        setPwaState(prev => ({
            ...prev,
            showUpdateNotification: false,
        }));
    }, []);
    return {
        // State
        showInstallPrompt: pwaState.showInstallPrompt,
        showUpdateNotification: pwaState.showUpdateNotification,
        updateAvailable: pwaState.updateAvailable,
        // Actions
        installPWA,
        updatePWA,
        dismissInstallPrompt,
        dismissUpdateNotification,
    };
};
