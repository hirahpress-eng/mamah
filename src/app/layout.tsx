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
  title: "Mamah \u2014 Asisten Penulis Akademik AI",
  description:
    "Hasilkan artikel akademik siap publikasi dengan AI. Mendukung 12 mode penulisan: artikel ilmiah, skripsi, tesis, disertasi, buku, proposal, dan lainnya. Temukan referensi dari 11 database, tulis dengan format IMRAD, dan ekspor ke PDF/DOCX.",
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
    "penulisan disertasi",
    "penulisan buku",
    "generator artikel ilmiah",
    "pencarian referensi akademik",
  ],
  authors: [{ name: "Mamah" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Mamah \u2014 Asisten Penulis Akademik AI",
    description:
      "Hasilkan artikel akademik siap publikasi dengan bantuan AI. 12 mode penulisan, pencarian referensi 11 database, dan ekspor profesional ke PDF/DOCX.",
    type: "website",
    siteName: "Mamah",
    locale: "id_ID",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mamah \u2014 AI Academic Writing Assistant" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mamah \u2014 Asisten Penulis Akademik AI",
    description: "Hasilkan artikel akademik siap publikasi dengan bantuan AI.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
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
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Mamah',
              description: 'Asisten Penulis Akademik AI \u2014 Hasilkan artikel akademik siap publikasi dengan 12 mode penulisan.',
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'IDR',
                description: 'Free tier available',
              },
              inLanguage: 'id',
              author: {
                '@type': 'Organization',
                name: 'Mamah',
                url: 'https://mamah.app',
              },
            }),
          }}
        />
      </head>
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