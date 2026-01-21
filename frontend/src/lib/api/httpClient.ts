import type { ErrorResponseDto } from "@/lib/auth/authTypes";

export class ApiError extends Error {
  status: number;
  data?: ErrorResponseDto;

  constructor(
    status: number,
    data?: ErrorResponseDto,
    message?: string
  ) {
    super(message || data?.message || "API request failed");
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Generic fetch wrapper for JSON API calls
 * - Serializes request body as JSON
 * - Parses response as JSON
 * - Throws ApiError for non-2xx status codes
 */
export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // For 204 No Content, return empty object
    if (response.status === 204) {
      return {} as T;
    }

    // Try to parse response body
    let data: unknown;
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      // If not JSON, try to read as text
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    // Handle non-2xx responses
    if (!response.ok) {
      throw new ApiError(
        response.status,
        data as ErrorResponseDto,
        (data as ErrorResponseDto)?.message
      );
    }

    return data as T;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Network errors or other fetch failures
    throw new ApiError(
      0,
      undefined,
      error instanceof Error ? error.message : "Network request failed"
    );
  }
}
