import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
export const PWAUpdateNotification = () => {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [offlineReady, setOfflineReady] = useState(false);
    useEffect(() => {
        const updateSW = registerSW({
            onNeedRefresh() {
                setNeedRefresh(true);
            },
            onOfflineReady() {
                setOfflineReady(true);
            },
        });
        return () => {
            updateSW();
        };
    }, []);
    const handleRefresh = () => {
        window.location.reload();
    };
    const handleClose = () => {
        setNeedRefresh(false);
        setOfflineReady(false);
    };
    if (!needRefresh && !offlineReady)
        return null;
    return (_jsx("div", { className: "fixed top-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-8 h-8 bg-green-500 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-white", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-900", children: needRefresh ? 'New version available' : 'App ready for offline use' }), _jsx("p", { className: "text-xs text-gray-500", children: needRefresh
                                        ? 'A new version of Gon Voice Assistant is available'
                                        : 'You can now use the app offline' })] })] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("button", { onClick: handleClose, className: "text-sm text-gray-500 hover:text-gray-700 px-2 py-1", children: "Dismiss" }), needRefresh && (_jsx("button", { onClick: handleRefresh, className: "bg-green-500 text-white text-sm px-4 py-2 rounded-md hover:bg-green-600 transition-colors", children: "Update" }))] })] }) }));
};
