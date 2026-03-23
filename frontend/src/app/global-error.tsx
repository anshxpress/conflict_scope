"use client";
import React from "react";

export default function GlobalError({ error }: { error: Error }) {
  // Minimal client-side global error boundary for Next.js app router
  console.error("GlobalError boundary caught:", error);
  return (
    <html>
      <body>
        <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
          <h1>Something went wrong</h1>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(error?.message ?? "")}</pre>
        </div>
      </body>
    </html>
  );
}
