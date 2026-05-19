import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://scope-conflict.vercel.app"),
  title: "ConflictScope – Open Global Conflict Intelligence Dashboard",
  description:
    "Real-time global conflict monitoring dashboard using open-source intelligence (OSINT). Visualize war events, airstrikes, missile strikes, and more on an interactive world map.",
  keywords: [
    "conflict monitoring",
    "OSINT",
    "war tracker",
    "conflict map",
    "geopolitical intelligence",
    "global risk assessment",
    "security monitoring",
  ],
  authors: [{ name: "ConflictScope" }],
  alternates: {
    canonical: "https://scope-conflict.vercel.app",
  },
  openGraph: {
    title: "ConflictScope – Open Global Conflict Intelligence Dashboard",
    description: "Real-time global conflict monitoring dashboard using open-source intelligence (OSINT). Visualize war events on an interactive map.",
    type: "website",
    url: "https://scope-conflict.vercel.app",
    siteName: "ConflictScope",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "ConflictScope Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ConflictScope – Open Global Conflict Intelligence Dashboard",
    description: "Real-time global conflict monitoring dashboard using open-source intelligence (OSINT).",
    images: ["/icon-512.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "ConflictScope",
    "url": "https://scope-conflict.vercel.app",
    "description": "Real-time global conflict monitoring dashboard using open-source intelligence (OSINT). Visualize war events, airstrikes, missile strikes, and more.",
    "applicationCategory": "NewsApplication, EducationalApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires HTML5 support, WebGL/Leaflet support",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    }
  };

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon-512.png" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <meta name="theme-color" content="#0a0e17" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} bg-cs-dark text-gray-200 antialiased overflow-hidden h-screen`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
