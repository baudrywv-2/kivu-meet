import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PushRegistration } from "@/components/PushRegistration";
import { AppErrorBoundaryWrapper } from "@/components/AppErrorBoundaryWrapper";
import { OfflineFallback } from "@/components/OfflineFallback";

/* Plus Jakarta Sans: geometric neo-grotesque, fun yet clean, compact, excellent on mobile & desktop */
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Kivu Meet - Discover people nearby",
  description: "Social discovery and dating for Goma, Bukavu, Beni, Butembo, Kinshasa, Lubumbashi, Kisangani & Matadi",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Kivu Meet" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon-192.png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen`}
      >
        <LanguageProvider>
          <ThemeProvider>
          <NotificationProvider>
            <AppErrorBoundaryWrapper>
              <OfflineFallback />
              <PushRegistration />
              {children}
            </AppErrorBoundaryWrapper>
          </NotificationProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
