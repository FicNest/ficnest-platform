import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Check content type to handle response appropriately
    const contentType = res.headers.get('content-type');
    let errorMessage;
    
    try {
      // Try to get the response text
      const text = await res.text();
      
      // Check if it's HTML (likely an error page)
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        // If it's HTML, provide a cleaner error message instead
        console.error("Server returned HTML instead of JSON:", text.substring(0, 100) + "...");
        errorMessage = "Server error occurred. Please try again later.";
      } 
      // If it looks like JSON, try to parse it
      else if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || res.statusText;
        } catch (e) {
          // If JSON parsing fails, use the text directly
          errorMessage = text || res.statusText;
        }
      } 
      // Otherwise just use the text
      else {
        errorMessage = text || res.statusText;
      }
    } catch (e) {
      // If all else fails, use the status text
      errorMessage = res.statusText || "Unknown error occurred";
    }
    
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Check if the response is empty (e.g., 204 No Content)
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // For non-JSON responses, just return null or an empty object
      return null;
    }
    
    try {
      return await res.json();
    } catch (error) {
      console.error("Error parsing JSON response:", error);
      return null;
    }
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