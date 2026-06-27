"use client";

import { useEffect } from "react";

const NTFY_BASE = process.env.NEXT_PUBLIC_NTFY_URL ?? "https://ntfy.sh";
const TOPIC_TEMPLATE = "nest-{userId}";

async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function showBrowserNotification(title: string, body: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico" });
}

export function useNtfySubscription(userId: string | null | undefined): void {
  useEffect(() => {
    if (!userId) return;

    const topic = TOPIC_TEMPLATE.replace("{userId}", userId);
    const url = `${NTFY_BASE}/${topic}/sse`;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      es = new EventSource(url);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event !== "message") return;
          const title: string = data.title ?? "Nest";
          const message: string = data.message ?? "";
          showBrowserNotification(title, message);
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 30_000);
        }
      };
    }

    requestNotificationPermission().then((granted) => {
      if (granted && !destroyed) connect();
    });

    return () => {
      destroyed = true;
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [userId]);
}
