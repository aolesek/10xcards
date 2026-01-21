const ACCESS_TOKEN_KEY = "10xcards_access_token";
const REFRESH_TOKEN_KEY = "10xcards_refresh_token";

/**
 * Token storage using localStorage (MVP)
 * 
 * Security note: localStorage is vulnerable to XSS attacks.
 * In production, consider using httpOnly cookies for refresh token.
 */

export const tokenStorage = {
  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Failed to get refresh token:", error);
      return null;
    }
  },

  /**
   * Save both tokens to localStorage
   */
  setTokens(accessToken: string, refreshToken: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error("Failed to save tokens:", error);
    }
  },

  /**
   * Clear both tokens from localStorage
   */
  clearTokens(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Failed to clear tokens:", error);
    }
  },

  /**
   * Check if user has tokens (basic auth check)
   */
  hasTokens(): boolean {
    return !!(this.getAccessToken() && this.getRefreshToken());
  },
};
