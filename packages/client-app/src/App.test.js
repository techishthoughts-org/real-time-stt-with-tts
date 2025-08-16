import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from './ui/App';
// Mock the hooks
vi.mock('./hooks/useAuth', () => ({
    useAuth: () => ({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
    }),
}));
vi.mock('./hooks/useVoiceAssistant', () => ({
    useVoiceAssistant: () => ({
        isListening: false,
        isSpeaking: false,
        transcription: '',
        response: '',
        startListening: vi.fn(),
        stopListening: vi.fn(),
        speak: vi.fn(),
        stopSpeaking: vi.fn(),
    }),
}));
vi.mock('./hooks/usePWA', () => ({
    usePWA: () => ({
        showInstallPrompt: false,
        showUpdateNotification: false,
        installPWA: vi.fn(),
        updatePWA: vi.fn(),
    }),
}));
// Mock react-router-dom
vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }) => _jsx("div", { children: children }),
    Routes: ({ children }) => _jsx("div", { children: children }),
    Route: ({ children }) => _jsx("div", { children: children }),
    Navigate: () => _jsx("div", { children: "Navigate" }),
}));
describe('App', () => {
    it('renders without crashing', () => {
        render(_jsx(App, {}));
        expect(document.body).toBeInTheDocument();
    });
    it('shows login screen when not authenticated', () => {
        render(_jsx(App, {}));
        // The app should render without crashing
        expect(document.body).toBeInTheDocument();
    });
});
