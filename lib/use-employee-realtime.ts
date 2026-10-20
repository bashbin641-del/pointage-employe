"use client";

import { useEffect, useRef } from "react";
import { CoreRealtimeEvent, subscribeToCoreEvents } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";

export function useEmployeeRealtime(onEvent: (event: CoreRealtimeEvent) => void) {
  const eventHandler = useRef(onEvent);

  useEffect(() => {
    eventHandler.current = onEvent;
  }, [onEvent]);

  useEffect(() => subscribeToCoreEvents("events/moi", {
    getAccessToken: async () => {
      const { data } = await (await createClient()).auth.getSession();
      return data.session?.access_token ?? null;
    },
    onEvent: (event) => eventHandler.current(event),
  }), []);
}
