import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container } from '@mui/material';
// Components
import Header from '../components/Header';
import VoiceAssistant from '../components/VoiceAssistant';
import ConversationHistory from '../components/ConversationHistory';
import Settings from '../components/Settings';
import Login from '../components/Login';
import LoadingScreen from '../components/LoadingScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import PWAUpdateNotification from '../components/PWAUpdateNotification';
// Hooks
import { useAuth } from '../hooks/useAuth';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { usePWA } from '../hooks/usePWA';
// Styles
import './App.css';
// Create React Query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: 1,
            retryDelay: 1000,
        },
    },
});
// Create Material-UI theme
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#667eea',
            light: '#8fa4ef',
            dark: '#4a5fd1',
        },
        secondary: {
            main: '#764ba2',
            light: '#9a6bb8',
            dark: '#5a3a7a',
        },
        background: {
            default: '#f8f9fa',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 700,
            fontSize: '2.5rem',
        },
        h2: {
            fontWeight: 600,
            fontSize: '2rem',
        },
        h3: {
            fontWeight: 600,
            fontSize: '1.5rem',
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 8,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                },
            },
        },
    },
});
const App = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { isListening, isSpeaking, transcription, response } = useVoiceAssistant();
    const { showInstallPrompt, showUpdateNotification, installPWA, updatePWA } = usePWA();
    useEffect(() => {
        // Initialize app
        const initializeApp = async () => {
            try {
                // Check for stored authentication
                const token = localStorage.getItem('sessionToken');
                if (token) {
                    // Validate token and set authentication state
                    // This would typically involve an API call to validate the token
                }
                setIsInitialized(true);
            }
            catch (error) {
                console.error('App initialization failed:', error);
                setIsInitialized(true);
            }
        };
        initializeApp();
    }, []);
    // Show loading screen while initializing
    if (!isInitialized || authLoading) {
        return _jsx(LoadingScreen, {});
    }
    return (_jsx(ErrorBoundary, { children: _jsxs(QueryClientProvider, { client: queryClient, children: [_jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(Router, { children: _jsxs(Box, { sx: { minHeight: '100vh', backgroundColor: 'background.default' }, children: [isAuthenticated ? (_jsxs(_Fragment, { children: [_jsx(Header, {}), _jsx(Container, { maxWidth: "lg", sx: { py: 3 }, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(VoiceAssistant, { isListening: isListening, isSpeaking: isSpeaking, transcription: transcription, response: response }) }), _jsx(Route, { path: "/conversations", element: _jsx(ConversationHistory, {}) }), _jsx(Route, { path: "/settings", element: _jsx(Settings, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) })] })) : (_jsx(Login, {})), showInstallPrompt && (_jsx(PWAInstallPrompt, { onInstall: installPWA })), showUpdateNotification && (_jsx(PWAUpdateNotification, { onUpdate: updatePWA }))] }) })] }), process.env.NODE_ENV === 'development' && _jsx(ReactQueryDevtools, { initialIsOpen: false })] }) }));
};
export default App;
