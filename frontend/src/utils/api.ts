const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export const apiRequest = async (path: string, options: ApiOptions = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (options.auth && typeof window !== "undefined") {
    const token = window.localStorage.getItem("accessToken");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || "Permintaan gagal";
    throw new Error(message);
  }

  return response.json();
};
