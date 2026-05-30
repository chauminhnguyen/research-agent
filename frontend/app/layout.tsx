import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Agent",
  description: "AI-powered research assistant with persistent memory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en">
        <body className="min-h-screen bg-canvas-soft antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
