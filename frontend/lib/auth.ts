import { auth } from "@clerk/nextjs/server";

export interface AuthState {
  user: { id: string; email: string } | null;
  isLoading: boolean;
}

export async function getToken(): Promise<string | null> {
  return null; // Clerk handles auth tokens automatically
}

export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return userId !== null;
}

export async function logout(): Promise<void> {
  // Clerk handles logout via SignIn component or window.location.href = "/sign-out"
}

export async function getCurrentUser() {
  const { userId } = await auth();
  return userId ? { id: userId } : null;
}
