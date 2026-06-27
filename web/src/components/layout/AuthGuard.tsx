"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserId } from "@/lib/auth";
import { useNtfySubscription } from "@/hooks/useNtfySubscription";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
    } else {
      setUserId(getUserId() || null);
      setReady(true);
    }
  }, [router]);

  useNtfySubscription(userId);

  if (!ready) return null;
  return <>{children}</>;
}
