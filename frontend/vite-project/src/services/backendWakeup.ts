// Backend Wake-up Service
export class BackendWakeupService {
  private static readonly BACKEND_URL = import.meta.env.VITE_API_URL || 'https://git-me-ai-v1.onrender.com';
  private static isWakingUp = false;
  private static isWarmedUp = false;

  /**
   * Wake up the backend on app initialization
   */
  static async wakeUpBackend(): Promise<boolean> {
    if (this.isWakingUp || this.isWarmedUp) {
      return this.isWarmedUp;
    }

    this.isWakingUp = true;
    console.log('🚀 Waking up backend server...');

    try {
      // Start warming up in the background
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`${this.BACKEND_URL}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.isWarmedUp = true;
        console.log('✅ Backend server is now warm and ready!');
        return true;
      } else {
        console.warn('⚠️ Backend server responded but might not be fully ready');
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Failed to wake up backend server:', error);
      return false;
    } finally {
      this.isWakingUp = false;
    }
  }

  /**
   * Check if backend is ready
   */
  static async isBackendReady(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get backend status
   */
  static getBackendStatus() {
    return {
      isWakingUp: this.isWakingUp,
      isWarmedUp: this.isWarmedUp,
      backendUrl: this.BACKEND_URL,
    };
  }
}
