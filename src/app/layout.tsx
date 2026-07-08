import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://mamah.app'),
  title: "Mamah — AI Academic Writing Assistant",
  description:
    "Generate publication-ready academic articles with AI. Define research topics, find references, and create IMRAD-formatted papers with professional academic writing.",
    keywords: [
    "academic writing",
    "literature generator",
    "research article",
    "IMRAD",
    "AI writing assistant",
    "publication-ready",
    "scientific paper",
    "asisten penulis akademik",
    "penulisan skripsi",
    "penulisan tesis",
  ],
  authors: [{ name: "Mamah" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Mamah — AI Academic Writing Assistant",
    description:
      "Generate publication-ready academic articles with AI-powered research assistance. Supports 12 writing modes: articles, theses, books, and more.",
    type: "website",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      {/* Auto-reload on Turbopack HMR chunk failure */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var RETRY_KEY = 'mamah_chunk_retry';
              var lastRetry = parseInt(sessionStorage.getItem(RETRY_KEY) || '0', 10);
              if (Date.now() - lastRetry < 30000) return;

              function isChunkError(msg) {
                return typeof msg === 'string' && (
                  msg.indexOf('Failed to load chunk') !== -1 ||
                  msg.indexOf('Loading chunk') !== -1 ||
                  msg.indexOf('ChunkLoadError') !== -1 ||
                  msg.indexOf('turbopack') !== -1 && msg.indexOf('chunk') !== -1
                );
              }

              window.addEventListener('error', function(e) {
                if (isChunkError(e.message || '')) {
                  sessionStorage.setItem(RETRY_KEY, Date.now().toString());
                  window.location.reload();
                }
              });

              window.addEventListener('unhandledrejection', function(e) {
                var msg = e.reason && (e.reason.message || e.reason || '');
                if (isChunkError(String(msg))) {
                  sessionStorage.setItem(RETRY_KEY, Date.now().toString());
                  window.location.reload();
                }
              });
            })();
          `,
        }}
      />
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased bg-background text-foreground body-gradient`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Ambient background orbs */}
          <div className="ambient-bg" aria-hidden="true">
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
          </div>
          {/* Noise texture overlay */}
          <div className="noise-overlay" aria-hidden="true" />
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
