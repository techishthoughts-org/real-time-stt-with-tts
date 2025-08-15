import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Voice Assistant APIs
  startVoiceRecognition: () => ipcRenderer.invoke('voice:start'),
  stopVoiceRecognition: () => ipcRenderer.invoke('voice:stop'),
  sendAudioFrame: (data: ArrayBuffer) => ipcRenderer.invoke('voice:frame', data),

  // LLM APIs
  sendMessage: (message: string) => ipcRenderer.invoke('llm:send', message),
  getResponse: () => ipcRenderer.invoke('llm:response'),

  // App APIs
  getVersion: () => ipcRenderer.invoke('app:version'),
  openSettings: () => ipcRenderer.invoke('app:settings'),

  // System APIs
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  checkMicrophone: () => ipcRenderer.invoke('system:microphone'),

  // Event listeners
  onVoiceData: (callback: (data: any) => void) =>
    ipcRenderer.on('voice:data', callback),
  onLLMResponse: (callback: (response: any) => void) =>
    ipcRenderer.on('llm:response', callback),
  onError: (callback: (error: any) => void) =>
    ipcRenderer.on('error', callback),
  onVoiceStart: (callback: () => void) =>
    ipcRenderer.on('voice:start', callback),
  onVoiceStop: (callback: () => void) =>
    ipcRenderer.on('voice:stop', callback)
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      startVoiceRecognition: () => Promise<void>;
      stopVoiceRecognition: () => Promise<void>;
      sendAudioFrame: (data: ArrayBuffer) => Promise<void>;
      sendMessage: (message: string) => Promise<void>;
      getResponse: () => Promise<any>;
      getVersion: () => Promise<string>;
      openSettings: () => Promise<void>;
      getSystemInfo: () => Promise<any>;
      checkMicrophone: () => Promise<boolean>;
      onVoiceData: (callback: (data: any) => void) => void;
      onLLMResponse: (callback: (response: any) => void) => void;
      onError: (callback: (error: any) => void) => void;
      onVoiceStart: (callback: () => void) => void;
      onVoiceStop: (callback: () => void) => void;
    };
  }
}
