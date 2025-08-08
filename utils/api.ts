// Supabase credentials are now loaded from environment variables (see `.env.local`)
const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID as string;
const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!projectId || !publicAnonKey) {
  throw new Error(
    'Supabase environment variables are missing. Please set NEXT_PUBLIC_SUPABASE_PROJECT_ID and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL ?? `https://${projectId}.supabase.co/functions/v1`;
const API_BASE_URL = `${FUNCTIONS_BASE_URL}/make-server-42a03002`;

class APIService {
  private headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    'apikey': publicAnonKey,
  };

  private async request<T>(endpoint: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: this.headers,
        credentials: 'omit',
        mode: 'cors',
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        // Try to read a response body for more context (may fail on CORS)
        let bodyText = '';
        try {
          bodyText = await response.text();
        } catch {
          // ignore
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}${bodyText ? ` - ${bodyText.slice(0, 300)}` : ''}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      // Normalize fetch/abort/CORS errors
      const message =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'Request timed out'
            : error.message
          : 'Unknown error';
      return { success: false, error: message };
    }
  }

  // Life Events API
  async getLifeEvents(userId: string) {
    return this.request(`/life-events/${userId}`);
  }

  async createLifeEvent(userId: string, eventData: any) {
    return this.request(`/life-events/${userId}`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateLifeEvent(userId: string, eventId: string, updates: any) {
    return this.request(`/life-events/${userId}/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteLifeEvent(userId: string, eventId: string) {
    return this.request(`/life-events/${userId}/${eventId}`, {
      method: 'DELETE',
    });
  }

  // AI Chat API
  async getChatMessages(userId: string) {
    return this.request(`/ai-chat/${userId}`);
  }

  async saveChatMessage(userId: string, messageData: any) {
    return this.request(`/ai-chat/${userId}`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  // Progress API
  async getProgress(userId: string) {
    return this.request(`/progress/${userId}`);
  }

  async updateProgress(userId: string, progressData: any) {
    return this.request(`/progress/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(progressData),
    });
  }

  // Future Vision API
  async getFutureVision(userId: string) {
    return this.request(`/future-vision/${userId}`);
  }

  async updateFutureVision(userId: string, visionData: any) {
    return this.request(`/future-vision/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(visionData),
    });
  }

  // Strength Analysis API
  async getStrengthAnalysis(userId: string) {
    return this.request(`/strength-analysis/${userId}`);
  }

  async createStrength(userId: string, strengthData: any) {
    return this.request(`/strengths/${userId}`, {
      method: 'POST',
      body: JSON.stringify(strengthData),
    });
  }

  async createWeakness(userId: string, weaknessData: any) {
    return this.request(`/weaknesses/${userId}`, {
      method: 'POST',
      body: JSON.stringify(weaknessData),
    });
  }

  // Experiences API
  async getExperiences(userId: string) {
    return this.request(`/experiences/${userId}`);
  }

  async createExperience(userId: string, experienceData: any) {
    return this.request(`/experiences/${userId}`, {
      method: 'POST',
      body: JSON.stringify(experienceData),
    });
  }

  // User Session API
  async createUserSession(userId: string) {
    return this.request(`/user/${userId}/session`, {
      method: 'POST',
    });
  }

  // User Data API (for LibraryPage favorites, views, etc.)
  async getUserData(userId: string) {
    try {
      const result = await this.request(`/user-data/${userId}`);
      if (result.success) {
        return result.data;
      }
      // Return default data if no user data exists
      return { favorites: [], views: {}, searchHistory: [] };
    } catch (error) {
      console.error('Failed to get user data:', error);
      // Return default data on error
      return { favorites: [], views: {}, searchHistory: [] };
    }
  }

  async updateUserData(userId: string, userData: any) {
    try {
      const result = await this.request(`/user-data/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      return result;
    } catch (error) {
      console.error('Failed to update user data:', error);
      // For now, just store in localStorage as fallback
      localStorage.setItem(`ipo-library-data-${userId}`, JSON.stringify(userData));
      return { success: true };
    }
  }
}

export const apiService = new APIService();