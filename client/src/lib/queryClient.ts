import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let errorObject: any = { message: `Error ${res.status}: ${res.statusText}` };
    
    // Try to extract a meaningful error message from JSON response
    try {
      const errorData = JSON.parse(text);
      
      // Extract the most specific error message available
      if (errorData.error) {
        errorObject.message = errorData.error;
      } else if (errorData.message) {
        errorObject.message = errorData.message;
      } else if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
        // Use validation details if available
        const firstError = errorData.details[0];
        errorObject.message = firstError.message || firstError.error || JSON.stringify(firstError);
      } else {
        // Fall back to the entire JSON if no specific error field
        errorObject.message = JSON.stringify(errorData);
      }
      
      // IMPORTANT: Preserve structured error details for dependency information
      if (errorData.details) {
        errorObject.details = errorData.details;
      }
      
      // Preserve dependency information for deletion errors
      if (errorData.dependencies) {
        errorObject.dependencies = errorData.dependencies;
      }
      
      if (errorData.summary) {
        errorObject.summary = errorData.summary;
      }
      
      if (errorData.counts) {
        errorObject.counts = errorData.counts;
      }
      
      // Preserve error code if present
      if (errorData.code) {
        errorObject.code = errorData.code;
      }
    } catch {
      // Not JSON or failed to parse - use text directly
      // For Fortune 50 compliance, always provide status code context
      errorObject.message = `Error ${res.status}: ${text || res.statusText}`;
    }
    
    // Create an error with message and attach additional properties
    const error = new Error(errorObject.message);
    Object.assign(error, errorObject);
    throw error;
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<any> {
  const headers: HeadersInit = {};
  
  // Only add Content-Type and body for methods that support it
  const methodSupportsBody = !['GET', 'HEAD'].includes(method.toUpperCase());
  
  if (data && methodSupportsBody) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Authorization header if token exists in localStorage
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    // Only include body for methods that support it (not GET/HEAD)
    body: (data && methodSupportsBody) ? JSON.stringify(data) : undefined,
    credentials: "include", // Keep this for cookie fallback
  });

  await throwIfResNotOk(res);
  
  // Handle responses with no content (like DELETE operations)
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null;
  }
  
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  
  return await res.text();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Add Authorization header if token exists
    const headers: HeadersInit = {};
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include", // Keep this for cookie fallback
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
