import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/src/lib/toast";
import { NetworkProvider } from "@/src/lib/network";
import { WalletProvider } from "@/src/context/WalletContext";
import { SettingsProvider } from "@/src/context/SettingsContext";
import NavHeader from "@/components/NavHeader";
import { ThemeProvider } from "@/src/lib/theme";
import PwaInit from "@/src/components/PwaInit";
import InstallPrompt from "@/src/components/InstallPrompt";
import PageViewTracker from "@/src/components/PageViewTracker";
import "./globals.css";
import { validateEnv } from "@/src/lib/env";
import { initAnalytics } from "@/src/lib/analytics";
import WebVitalsReporter from "@/src/components/WebVitalsReporter";

validateEnv();
initAnalytics();

export const metadata: Metadata = {
  title: "SoroStream",
  description: "Real-time XLM payment streaming on Stellar Soroban",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SoroStream",
  },
  other: {
    // Android / Chrome home screen
    "mobile-web-app-capable": "yes",
    // Tile colour for Windows
    "msapplication-TileColor": "#16a34a",
    "msapplication-TileImage": "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* iOS home screen icon */}
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        {/* iOS splash / standalone tweaks */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen">
        <SettingsProvider>
          <WalletProvider>
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
          </WalletProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
