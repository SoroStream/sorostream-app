import type { Metadata } from "next";
import { ToastProvider } from "@/src/lib/toast";
import { NetworkProvider } from "@/src/lib/network";
import NavHeader from "@/components/NavHeader";
import { ThemeProvider } from "@/src/lib/theme";
import "./globals.css";
import { validateEnv } from "@/src/lib/env";
import { initAnalytics } from "@/src/lib/analytics";
import PageViewTracker from "@/src/components/PageViewTracker";
import WebVitalsReporter from "@/src/components/WebVitalsReporter";

validateEnv();
initAnalytics();

export const metadata: Metadata = {
  title: "SoroStream",
  description: "Real-time USDC payment streaming on Stellar Soroban",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <NetworkProvider>
            <ToastProvider>
              <NavHeader />
              <PageViewTracker />
              <WebVitalsReporter />
              {children}
            </ToastProvider>
          </NetworkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
