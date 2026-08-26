"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export function useAuth(initialUser?: User | null) {
  const [currentUser, setCurrentUser] = useState<User | null>(
    initialUser ?? null
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUser(initialUser ?? null);
  }, [initialUser]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Only update if the user identity actually changed to avoid no-op re-renders
      setCurrentUser((prev) => {
        if (prev?.id === user?.id) return prev;
        return user ?? null;
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      // Deduplicate: skip state update when the user object hasn't changed.
      // This prevents rapid token-refresh events from flooding history.replaceState
      // via AppShell's usePathname, which triggers Chromium's navigation throttle.
      setCurrentUser((prev) => {
        if (prev?.id === nextUser?.id) return prev;
        return nextUser;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = !!currentUser;

  return { currentUser, isAdmin, setCurrentUser };
}
