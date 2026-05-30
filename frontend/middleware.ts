import { authMiddleware, redirectToSignIn } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define which routes require authentication
const publicRoutes = ["/login", "/register", "/api/webhooks/clerk"];

export default authMiddleware({
  publicRoutes,
  afterAuth(auth, req, evt) {
    // Allow public routes to pass through
    if (auth.isPublicRoute) {
      return NextResponse.next();
    }

    // Redirect unauthenticated users to sign in
    if (!auth.userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }
  },
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless included in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
