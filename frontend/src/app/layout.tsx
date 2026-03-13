import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "ConflictScope – Open Global Conflict Intelligence Dashboard",
  description:
    "Real-time global conflict monitoring dashboard using open-source intelligence (OSINT). Visualize war events, airstrikes, missile strikes, and more on an interactive world map.",
  keywords: [
    "conflict monitoring",
    "OSINT",
    "war tracker",
    "conflict map",
    "geopolitical intelligence",
  ],
  authors: [{ name: "ConflictScope" }],
  openGraph: {
    title: "ConflictScope",
    description: "Open Global Conflict Intelligence Dashboard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cs-dark text-gray-200 antialiased overflow-hidden h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
