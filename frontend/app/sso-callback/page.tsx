"use client";

import { useOAuthCallback } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SSOCallbackPage() {
  const { handleRedirectCallback } = useOAuthCallback();
  const router = useRouter();

  useEffect(() => {
    handleRedirectCallback().then((result) => {
      if (result) {
        router.push(result.pubResourceErrorUrl || "/chat");
      } else {
        router.push("/chat");
      }
    }).catch(() => {
      router.push("/login");
    });
  }, [handleRedirectCallback, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-soft">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-body">Completing sign in...</p>
      </div>
    </div>
  );
}
