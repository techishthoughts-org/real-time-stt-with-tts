import '@testing-library/jest-dom';
import { vi } from 'vitest';
// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
global.localStorage = localStorageMock;
// Mock sessionStorage
const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;
// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'node.js',
        serviceWorker: {
            register: vi.fn(),
        },
    },
    writable: true,
});
// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
    createMediaStreamSource: vi.fn(),
    createAnalyser: vi.fn(),
    createGain: vi.fn(),
    createOscillator: vi.fn(),
    createBiquadFilter: vi.fn(),
    createBuffer: vi.fn(),
    createBufferSource: vi.fn(),
    createChannelMerger: vi.fn(),
    createChannelSplitter: vi.fn(),
    createConvolver: vi.fn(),
    createDelay: vi.fn(),
    createDynamicsCompressor: vi.fn(),
    createIIRFilter: vi.fn(),
    createMediaElementSource: vi.fn(),
    createMediaStreamDestination: vi.fn(),
    createPanner: vi.fn(),
    createPeriodicWave: vi.fn(),
    createScriptProcessor: vi.fn(),
    createStereoPanner: vi.fn(),
    createWaveShaper: vi.fn(),
    decodeAudioData: vi.fn(),
    resume: vi.fn(),
    suspend: vi.fn(),
    close: vi.fn(),
    state: 'running',
    sampleRate: 44100,
    currentTime: 0,
    destination: {},
    listener: {},
}));
// Mock MediaDevices API
Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn(),
        getDisplayMedia: vi.fn(),
    },
    writable: true,
});
// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
}));
// Mock fetch
global.fetch = vi.fn();
// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
