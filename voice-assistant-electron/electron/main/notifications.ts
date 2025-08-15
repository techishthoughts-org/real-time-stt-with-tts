import { Notification, nativeImage } from 'electron';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  actions?: Array<{
    type: 'button' | 'textbox';
    text: string;
    placeholder?: string;
  }>;
  timeoutType?: 'default' | 'never';
  urgency?: 'low' | 'normal' | 'high' | 'critical';
  silent?: boolean;
  sound?: string;
  subtitle?: string;
  replyPlaceholder?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private isSupported: boolean;

  constructor() {
    this.isSupported = Notification.isSupported();

    if (!this.isSupported) {
      console.warn('⚠️ Notifications are not supported on this platform');
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  show(options: NotificationOptions): void {
    if (!this.isSupported) {
      console.log('📢 Notification (fallback):', options.title, options.body);
      return;
    }

    const notification = new Notification({
      title: options.title,
      body: options.body,
      subtitle: options.subtitle,
      icon: options.icon ? nativeImage.createFromPath(options.icon) : undefined,
      silent: options.silent || false,
      timeoutType: options.timeoutType || 'default',
      urgency: options.urgency || 'normal',
      actions: options.actions,
      replyPlaceholder: options.replyPlaceholder,
    });

    // Handle notification events
    notification.on('click', () => {
      console.log('📢 Notification clicked:', options.title);
      this.handleNotificationClick(options);
    });

    notification.on('action', (event, index) => {
      console.log('📢 Notification action clicked:', index);
      this.handleNotificationAction(options, index);
    });

    notification.on('reply', (event, reply) => {
      console.log('📢 Notification reply:', reply);
      this.handleNotificationReply(options, reply);
    });

    notification.on('show', () => {
      console.log('📢 Notification shown:', options.title);
    });

    notification.on('close', () => {
      console.log('📢 Notification closed:', options.title);
    });

    notification.show();
  }

  showVoiceActivated(): void {
    this.show({
      title: '🎤 Voice Assistant',
      body: 'Voice recording started. Speak now!',
      urgency: 'normal',
      timeoutType: 'never',
      actions: [
        { type: 'button', text: 'Stop Recording' },
        { type: 'button', text: 'Settings' }
      ]
    });
  }

  showVoiceDeactivated(): void {
    this.show({
      title: '🛑 Voice Assistant',
      body: 'Voice recording stopped.',
      urgency: 'low',
      timeoutType: 'default'
    });
  }

  showResponseReceived(response: string): void {
    this.show({
      title: '🤖 Voice Assistant',
      body: response.length > 100 ? response.substring(0, 100) + '...' : response,
      urgency: 'normal',
      timeoutType: 'default',
      actions: [
        { type: 'button', text: 'Copy Response' },
        { type: 'button', text: 'Continue Conversation' }
      ]
    });
  }

  showError(error: string): void {
    this.show({
      title: '❌ Voice Assistant Error',
      body: error,
      urgency: 'high',
      timeoutType: 'default',
      actions: [
        { type: 'button', text: 'Retry' },
        { type: 'button', text: 'Report Issue' }
      ]
    });
  }

  showServerStatus(isConnected: boolean): void {
    this.show({
      title: '🌐 Server Status',
      body: isConnected ? 'Connected to voice assistant server' : 'Disconnected from server',
      urgency: isConnected ? 'low' : 'high',
      timeoutType: 'default',
      actions: [
        { type: 'button', text: isConnected ? 'Disconnect' : 'Reconnect' },
        { type: 'button', text: 'Settings' }
      ]
    });
  }

  showUpdateAvailable(version: string): void {
    this.show({
      title: '🔄 Update Available',
      body: `Version ${version} is available for download.`,
      urgency: 'normal',
      timeoutType: 'never',
      actions: [
        { type: 'button', text: 'Download Now' },
        { type: 'button', text: 'Remind Later' }
      ]
    });
  }

  showWelcome(): void {
    this.show({
      title: '👋 Welcome to Voice Assistant',
      body: 'Your personal AI assistant is ready to help! Use Cmd+Shift+Space to start recording.',
      urgency: 'low',
      timeoutType: 'default',
      actions: [
        { type: 'button', text: 'Get Started' },
        { type: 'button', text: 'View Tutorial' }
      ]
    });
  }

  showMuted(): void {
    this.show({
      title: '🔇 Voice Assistant Muted',
      body: 'Voice assistant is now muted. Use Cmd+Shift+M to unmute.',
      urgency: 'low',
      timeoutType: 'default'
    });
  }

  showUnmuted(): void {
    this.show({
      title: '🔊 Voice Assistant Unmuted',
      body: 'Voice assistant is now listening.',
      urgency: 'low',
      timeoutType: 'default'
    });
  }

  private handleNotificationClick(options: NotificationOptions): void {
    // Handle notification click - could focus the main window
    console.log('📢 Handling notification click for:', options.title);
  }

  private handleNotificationAction(options: NotificationOptions, actionIndex: number): void {
    const action = options.actions?.[actionIndex];
    if (!action) return;

    console.log('📢 Handling notification action:', action.text);

    switch (action.text) {
      case 'Stop Recording':
        // Send message to renderer to stop recording
        break;
      case 'Settings':
        // Open settings
        break;
      case 'Copy Response':
        // Copy response to clipboard
        break;
      case 'Continue Conversation':
        // Continue conversation
        break;
      case 'Retry':
        // Retry the failed operation
        break;
      case 'Report Issue':
        // Open issue reporting
        break;
      case 'Reconnect':
        // Reconnect to server
        break;
      case 'Download Now':
        // Download update
        break;
      case 'Get Started':
        // Show getting started guide
        break;
      case 'View Tutorial':
        // Show tutorial
        break;
    }
  }

  private handleNotificationReply(options: NotificationOptions, reply: string): void {
    console.log('📢 Handling notification reply:', reply);
    // Handle reply - could send to voice assistant
  }

  // Request notification permissions
  requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      return Promise.resolve(false);
    }

    // On macOS, notifications are enabled by default
    // This is mainly for other platforms
    return Promise.resolve(true);
  }

  // Check if notifications are enabled
  isEnabled(): boolean {
    return this.isSupported;
  }
}

export const notificationService = NotificationService.getInstance();
