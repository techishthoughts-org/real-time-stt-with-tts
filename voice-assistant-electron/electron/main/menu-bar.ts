import { app, BrowserWindow, globalShortcut, Menu, nativeImage, Tray } from 'electron';
import { join } from 'path';

export class MenuBarService {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private isRecording = false;
  private isListening = false;

  constructor() {
    this.setupTray();
    this.setupGlobalShortcuts();
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private setupTray(): void {
    // Create tray icon
    const iconPath = join(__dirname, '../../build/tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);

    // Fallback to a simple icon if file doesn't exist
    if (icon.isEmpty()) {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#007AFF';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(4, 4, 8, 8);
      }
      const fallbackIcon = nativeImage.createFromDataURL(canvas.toDataURL());
      this.tray = new Tray(fallbackIcon);
    } else {
      this.tray = new Tray(icon);
    }

    this.updateTrayMenu();
  }

  private setupGlobalShortcuts(): void {
    // Register global shortcuts
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      this.toggleVoiceActivation();
    });

    globalShortcut.register('CommandOrControl+Shift+V', () => {
      this.showMainWindow();
    });

    globalShortcut.register('CommandOrControl+Shift+M', () => {
      this.toggleMute();
    });

    // Log registered shortcuts
    console.log('🎯 Global shortcuts registered:');
    console.log('  Cmd+Shift+Space: Toggle voice activation');
    console.log('  Cmd+Shift+V: Show main window');
    console.log('  Cmd+Shift+M: Toggle mute');
  }

  private updateTrayMenu(): void {
    if (!this.tray) return;

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Voice Assistant',
        enabled: false,
        icon: nativeImage.createFromPath(join(__dirname, '../../build/icon.png')).resize({ width: 16, height: 16 })
      },
      { type: 'separator' },
      {
        label: this.isRecording ? '🛑 Stop Recording' : '🎤 Start Recording',
        accelerator: 'CmdOrCtrl+Shift+Space',
        click: () => this.toggleVoiceActivation()
      },
      {
        label: this.isListening ? '🔇 Mute' : '🔊 Unmute',
        accelerator: 'CmdOrCtrl+Shift+M',
        click: () => this.toggleMute()
      },
      { type: 'separator' },
      {
        label: '📱 Show Main Window',
        accelerator: 'CmdOrCtrl+Shift+V',
        click: () => this.showMainWindow()
      },
      {
        label: '⚙️ Settings',
        click: () => this.openSettings()
      },
      { type: 'separator' },
      {
        label: '📊 Status',
        submenu: [
          {
            label: `Recording: ${this.isRecording ? '🟢 Active' : '🔴 Inactive'}`,
            enabled: false
          },
          {
            label: `Listening: ${this.isListening ? '🟢 Active' : '🔴 Inactive'}`,
            enabled: false
          },
          {
            label: `Server: ${this.checkServerStatus() ? '🟢 Connected' : '🔴 Disconnected'}`,
            enabled: false
          }
        ]
      },
      { type: 'separator' },
      {
        label: '❓ Help',
        submenu: [
          {
            label: '📖 User Guide',
            click: () => this.openUserGuide()
          },
          {
            label: '🐛 Report Bug',
            click: () => this.reportBug()
          },
          {
            label: '💡 Feature Request',
            click: () => this.requestFeature()
          }
        ]
      },
      { type: 'separator' },
      {
        label: '🚪 Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit()
      }
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);

    // Update tray tooltip
    const status = this.isRecording ? 'Recording' : this.isListening ? 'Listening' : 'Idle';
    this.tray.setToolTip(`Voice Assistant - ${status}`);
  }

  private toggleVoiceActivation(): void {
    this.isRecording = !this.isRecording;
    this.updateTrayMenu();

    if (this.mainWindow) {
      this.mainWindow.webContents.send('voice:toggle', { isRecording: this.isRecording });
    }

    // Update tray icon based on state
    this.updateTrayIcon();
  }

  private toggleMute(): void {
    this.isListening = !this.isListening;
    this.updateTrayMenu();

    if (this.mainWindow) {
      this.mainWindow.webContents.send('voice:mute', { isMuted: !this.isListening });
    }
  }

  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.focus();
      } else {
        this.mainWindow.show();
      }
    }
  }

  private openSettings(): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('app:open-settings');
    }
  }

  private openUserGuide(): void {
    // Open user guide in default browser
    require('electron').shell.openExternal('https://github.com/arthurcosta/real-time-stt-with-tts#readme');
  }

  private reportBug(): void {
    // Open bug report in default browser
    require('electron').shell.openExternal('https://github.com/arthurcosta/real-time-stt-with-tts/issues/new');
  }

  private requestFeature(): void {
    // Open feature request in default browser
    require('electron').shell.openExternal('https://github.com/arthurcosta/real-time-stt-with-tts/issues/new');
  }

  private checkServerStatus(): boolean {
    // This would check if the server is running
    // For now, return true as a placeholder
    return true;
  }

  private updateTrayIcon(): void {
    if (!this.tray) return;

    // Create different icons based on state
    let iconPath: string;

    if (this.isRecording) {
      iconPath = join(__dirname, '../../build/tray-recording.png');
    } else if (this.isListening) {
      iconPath = join(__dirname, '../../build/tray-listening.png');
    } else {
      iconPath = join(__dirname, '../../build/tray-icon.png');
    }

    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      this.tray.setImage(icon);
    }
  }

  updateStatus(isRecording: boolean, isListening: boolean): void {
    this.isRecording = isRecording;
    this.isListening = isListening;
    this.updateTrayMenu();
    this.updateTrayIcon();
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }

    // Unregister global shortcuts
    globalShortcut.unregisterAll();
  }
}

export const menuBarService = new MenuBarService();
