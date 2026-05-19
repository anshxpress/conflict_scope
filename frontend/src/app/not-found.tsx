import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cs-dark text-gray-200 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-6 bg-cs-panel border border-cs-border p-8 rounded-lg shadow-xl">
        <div className="flex justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-16 h-16 text-cs-accent animate-pulse">
            <circle cx="12" cy="12" r="3" fill="#ef4444" />
            <path
              d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
            <path
              d="M2 12h20M12 2v20"
              stroke="#ef4444"
              strokeWidth="0.75"
              strokeOpacity="0.3"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-wider text-gray-100 uppercase">
          Page Not Found
        </h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          The geopolitical monitoring coordinates you requested do not exist or have been reclassified.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block bg-cs-accent hover:bg-red-600 text-white font-semibold text-sm py-2.5 px-6 rounded transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
