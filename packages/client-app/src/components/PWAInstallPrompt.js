import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallPrompt(true);
        };
        const handleAppInstalled = () => {
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);
    const handleInstallClick = async () => {
        if (!deferredPrompt)
            return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        else {
            console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };
    const handleDismiss = () => {
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
    };
    if (!showInstallPrompt)
        return null;
    return (_jsx("div", { className: "fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-6 h-6 text-white", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" }) }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-900", children: "Install Gon Voice Assistant" }), _jsx("p", { className: "text-xs text-gray-500", children: "Add to home screen for quick access" })] })] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("button", { onClick: handleDismiss, className: "text-sm text-gray-500 hover:text-gray-700 px-2 py-1", children: "Not now" }), _jsx("button", { onClick: handleInstallClick, className: "bg-indigo-500 text-white text-sm px-4 py-2 rounded-md hover:bg-indigo-600 transition-colors", children: "Install" })] })] }) }));
};
