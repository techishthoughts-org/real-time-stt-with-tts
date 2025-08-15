
class MemoryManager {
  private memoryThreshold = 500 * 1024 * 1024; // 500MB
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupMemoryMonitoring();
  }

  private setupMemoryMonitoring() {
    // Check memory every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);
  }

  private async checkMemoryUsage() {
    try {
      const memoryInfo = await process.getProcessMemoryInfo();
      const privateBytes = memoryInfo.privateBytes;

      console.log(`Memory usage: ${(privateBytes / 1024 / 1024).toFixed(2)} MB`);

      if (privateBytes > this.memoryThreshold) {
        console.warn('Memory usage exceeded threshold, cleaning up...');
        await this.cleanupMemory();
      }
    } catch (error) {
      console.error('Failed to check memory usage:', error);
    }
  }

  private async cleanupMemory() {
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('Garbage collection performed');
      }

      // Clear any caches or temporary data
      this.clearCaches();

      // Log memory after cleanup
      const memoryInfo = await process.getProcessMemoryInfo();
      console.log(`Memory after cleanup: ${(memoryInfo.privateBytes / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Memory cleanup failed:', error);
    }
  }

  private clearCaches() {
    // Clear any application caches
    // This would be implemented based on what caches your app uses
    console.log('Clearing application caches...');
  }

  // Method to get current memory usage
  async getMemoryUsage() {
    try {
      const memoryInfo = await process.getProcessMemoryInfo();
      return {
        privateBytes: memoryInfo.privateBytes,
        sharedBytes: memoryInfo.sharedBytes,
        peakWorkingSetSize: memoryInfo.peakWorkingSetSize,
        privateBytesMB: (memoryInfo.privateBytes / 1024 / 1024).toFixed(2),
        sharedBytesMB: (memoryInfo.sharedBytes / 1024 / 1024).toFixed(2),
        peakWorkingSetSizeMB: (memoryInfo.peakWorkingSetSize / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      console.error('Failed to get memory usage:', error);
      return null;
    }
  }

  // Method to manually trigger cleanup
  async forceCleanup() {
    await this.cleanupMemory();
  }

  // Method to stop monitoring
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Method to restart monitoring
  restartMonitoring() {
    this.stopMonitoring();
    this.setupMemoryMonitoring();
  }
}

export const memoryManager = new MemoryManager();
