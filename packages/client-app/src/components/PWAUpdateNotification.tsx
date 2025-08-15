import React, { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export const PWAUpdateNotification: React.FC = () => {
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

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed top-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {needRefresh ? 'New version available' : 'App ready for offline use'}
            </h3>
            <p className="text-xs text-gray-500">
              {needRefresh
                ? 'A new version of Gon Voice Assistant is available'
                : 'You can now use the app offline'
              }
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleClose}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            Dismiss
          </button>
          {needRefresh && (
            <button
              onClick={handleRefresh}
              className="bg-green-500 text-white text-sm px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
            >
              Update
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
