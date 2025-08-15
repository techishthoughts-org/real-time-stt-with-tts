import { app, BrowserWindow, Menu } from 'electron';
import { join } from 'path';

// Import our modules
import { audioProcessor } from './audio';
import { memoryManager } from './memory';
import { menuBarService } from './menu-bar';
import { notificationService } from './notifications';
import { serverBridge } from './server-bridge';

function createWindow(): void {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    titleBarStyle: 'hiddenInset', // macOS native title bar
    vibrancy: 'under-window', // macOS blur effect
    visualEffectState: 'active'
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();

    // Set up menu bar service with main window
    menuBarService.setMainWindow(mainWindow);

    // Show welcome notification
    notificationService.showWelcome();
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // macOS menu setup
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Voice',
        submenu: [
          {
            label: 'Start Recording',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              mainWindow.webContents.send('voice:start');
            }
          },
          {
            label: 'Stop Recording',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              mainWindow.webContents.send('voice:stop');
            }
          }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// App event handlers
app.whenReady().then(() => {
  app.setAppUserModelId('com.voice.assistant');

  // Initialize modules
  audioProcessor;
  serverBridge;
  memoryManager;

  // Request notification permissions
  notificationService.requestPermission();

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    menuBarService.destroy();
    app.quit();
  }
});

app.on('before-quit', () => {
  menuBarService.destroy();
});

// GPU acceleration
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
