import type { Metadata } from "next";
import { ToastProvider } from "@/src/lib/toast";
import { NetworkProvider } from "@/src/lib/network";
import NavHeader from "@/components/NavHeader";
import "./globals.css";
import { validateEnv } from "@/src/lib/env";
import { initAnalytics } from "@/src/lib/analytics";
import PageViewTracker from "@/src/components/PageViewTracker";

// Validate environment variables at startup
validateEnv();

// Initialize analytics
initAnalytics();

export const metadata: Metadata = {
  title: "SoroStream",
  description: "Real-time USDC payment streaming on Stellar Soroban",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen">
        <NetworkProvider>
          <ToastProvider>
            <NavHeader />
            {children}
          </ToastProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}
