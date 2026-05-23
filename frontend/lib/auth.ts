import { api } from "./api";

export interface AuthState {
  user: { id: string; email: string } | null;
  isLoading: boolean;
}

export async function getToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/token", {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
  } catch {
    // Cookie not available
  }
  return null;
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    await api.auth.me();
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } finally {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

export async function getCurrentUser() {
  try {
    return await api.auth.me();
  } catch {
    return null;
  }
}
