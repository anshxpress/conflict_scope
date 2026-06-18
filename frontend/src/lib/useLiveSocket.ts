import { useEffect, useRef } from "react";

// Dynamically construct WS URL from the HTTP API URL
const getWsUrl = () => {
  const defaultHttpUrl =
    typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? "https://conflictscope-api.onrender.com"
      : "http://localhost:3001";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || defaultHttpUrl;
  return apiUrl.replace(/^http/, "ws") + "/ws";
};

interface UseLiveSocketOptions {
  onNewEvent?: (event: any) => void;
  onNewArticle?: (article: any) => void;
  enabled?: boolean;
}

export function useLiveSocket({
  onNewEvent,
  onNewArticle,
  enabled = true,
}: UseLiveSocketOptions) {
  const onNewEventRef = useRef(onNewEvent);
  const onNewArticleRef = useRef(onNewArticle);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const socketRef = useRef<WebSocket | null>(null);

  // Keep references up to date to avoid effect cycles
  useEffect(() => {
    onNewEventRef.current = onNewEvent;
    onNewArticleRef.current = onNewArticle;
  }, [onNewEvent, onNewArticle]);

  useEffect(() => {
    if (!enabled) return;

    let isDisposed = false;
    let reconnectDelay = 1000;

    const connect = () => {
      const url = getWsUrl();
      console.log(`[WS] Connecting to Live Feed at ${url}...`);

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[WS] Live Feed connected successfully");
        reconnectDelay = 1000; // Reset delay
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "new-event" && onNewEventRef.current) {
            onNewEventRef.current(payload.data);
          } else if (payload.type === "new-article" && onNewArticleRef.current) {
            onNewArticleRef.current(payload.data);
          }
        } catch (err) {
          console.error("[WS] Failed to parse message:", err);
        }
      };

      socket.onclose = (e) => {
        socketRef.current = null;
        if (isDisposed) return;

        console.warn(
          `[WS] Live Feed disconnected: ${e.reason || "unspecified"}. Reconnecting in ${reconnectDelay}ms...`,
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 1.5, 30000); // Exponential backoff capped at 30s
          connect();
        }, reconnectDelay);
      };

      socket.onerror = (err) => {
        console.error("[WS] Error encountered:", err);
        socket.close();
      };
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [enabled]);
}
