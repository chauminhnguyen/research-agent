"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/clerk-react";

function SSOCallbackContent() {
  const router = useRouter();
  const { isLoaded, userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && userId) {
        // Successfully authenticated, redirect to chat
        router.push("/chat");
      } else {
        // Authentication failed, redirect to login
        router.push("/login");
      }
    }
  }, [isLoaded, isSignedIn, userId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-soft">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-body">Completing sign in...</p>
      </div>
    </div>
  );
}

function SSOCallbackFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-soft">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-body">Loading...</p>
      </div>
    </div>
  );
}

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={<SSOCallbackFallback />}>
      <SSOCallbackContent />
    </Suspense>
  );
}
