import { ipcMain } from 'electron';
import fetch from 'node-fetch';

class ServerBridge {
  private serverUrl = 'http://localhost:3030';
  private authToken: string | null = null;

  constructor() {
    this.setupIPC();
  }

  private setupIPC() {
    ipcMain.handle('llm:send', async (_: any, message: string) => {
      try {
        const token = await this.getAuthToken();
        const response = await fetch(`${this.serverUrl}/llm/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message,
            context: 'Electron client'
          })
        });

        if (response.ok) {
          const data = await response.json();
          return data;
        } else {
          throw new Error(`LLM request failed: ${response.status}`);
        }
      } catch (error) {
        console.error('LLM request failed:', error);
        throw error;
      }
    });

    ipcMain.handle('app:version', async () => {
      return '1.0.0';
    });

    ipcMain.handle('app:settings', async () => {
      // Open settings window or dialog
      console.log('Opening settings...');
    });

    ipcMain.handle('system:info', async () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        electronVersion: process.versions.electron
      };
    });

    ipcMain.handle('llm:response', async () => {
      // This would be used for streaming responses
      return null;
    });
  }

  private async getAuthToken(): Promise<string> {
    if (this.authToken) {
      return this.authToken;
    }

    try {
      const response = await fetch(`${this.serverUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'electron-client' })
      });

      if (response.ok) {
        const data = await response.json();
        this.authToken = (data as any).token;
        return this.authToken || '';
      } else {
        throw new Error('Failed to get auth token');
      }
    } catch (error) {
      console.error('Auth token request failed:', error);
      throw error;
    }
  }

  // Method to refresh token if needed
  async refreshToken(): Promise<void> {
    this.authToken = null;
    await this.getAuthToken();
  }

  // Method to check server health
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  }
}

export const serverBridge = new ServerBridge();
