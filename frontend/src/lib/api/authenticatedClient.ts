import { ApiError, fetchJson } from "./httpClient";
import { tokenStorage } from "@/lib/auth/tokenStorage";
import { refreshAccessToken } from "./authApi";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Fetch wrapper with automatic token refresh
 * - Adds Authorization header from tokenStorage
 * - Automatically refreshes expired tokens
 * - Retries failed requests after refresh
 * - Logs out user if refresh fails
 */
export async function authenticatedFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const accessToken = tokenStorage.getAccessToken();

  if (!accessToken) {
    throw new ApiError(401, undefined, "No access token available");
  }

  // Add Authorization header
  const authenticatedOptions: FetchOptions = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };

  try {
    // Try the request with current access token
    return await fetchJson<T>(url, authenticatedOptions);
  } catch (error) {
    // If not a 401 error, rethrow
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    // Try to refresh the token
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      // No refresh token, can't refresh
      throw error;
    }

    try {
      // Refresh the token
      const response = await refreshAccessToken(refreshToken);
      
      // Save new tokens
      tokenStorage.setTokens(response.accessToken, response.refreshToken);

      // Retry the original request with new access token
      const retryOptions: FetchOptions = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${response.accessToken}`,
        },
      };

      return await fetchJson<T>(url, retryOptions);
    } catch (refreshError) {
      // Refresh failed, clear tokens and rethrow
      tokenStorage.clearTokens();
      
      // Dispatch custom event to notify auth context
      window.dispatchEvent(new CustomEvent("auth:token-refresh-failed"));
      
      throw refreshError;
    }
  }
}
