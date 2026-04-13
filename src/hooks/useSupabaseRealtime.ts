"use client";

// =============================================================================
// SmileCraft CMS — Supabase Realtime Hook
// Generic, type-safe subscription to Postgres changes via Supabase Realtime.
// =============================================================================

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------
type TableName = keyof Database["public"]["Tables"];

type RowPayload<T extends TableName> = Database["public"]["Tables"][T]["Row"];

type EventName = "INSERT" | "UPDATE" | "DELETE";

// Supabase realtime payload type
interface PostgresChangesPayload<T> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: EventName;
  new: T | null;
  old: T | null;
  errors?: any[];
}

// ---------------------------------------------------------------------------
// Callback signature — receives the changed row plus metadata
// ---------------------------------------------------------------------------
export type RealtimeCallback<T extends TableName> = (payload: {
  event: EventName;
  newRecord: RowPayload<T> | null;
  oldRecord: RowPayload<T> | null;
}) => void;

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------
export interface UseSupabaseRealtimeOptions<T extends TableName> {
  /** Callback invoked on every realtime event */
  onEvent: RealtimeCallback<T>;
  /** Enable/disable the subscription (default: true) */
  enabled?: boolean;
  /** Optional filter by event type */
  eventFilter?: EventName | EventName[];
  /** Optional error handler */
  onError?: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useSupabaseRealtime<T extends TableName>(
  tableName: T,
  callback: RealtimeCallback<T>,
  enabled?: boolean,
): void;

export function useSupabaseRealtime<T extends TableName>(
  tableName: T,
  options: UseSupabaseRealtimeOptions<T>,
): void;

export function useSupabaseRealtime<T extends TableName>(
  tableName: T,
  callbackOrOptions: RealtimeCallback<T> | UseSupabaseRealtimeOptions<T>,
  enabled: boolean = true,
): void {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef<RealtimeCallback<T> | undefined>(undefined);
  const optionsRef = useRef<UseSupabaseRealtimeOptions<T> | undefined>(undefined);

  // Normalize arguments
  const isOptions = typeof callbackOrOptions === "object" && callbackOrOptions !== null && "onEvent" in callbackOrOptions;
  
  useEffect(() => {
    if (isOptions) {
      optionsRef.current = callbackOrOptions as UseSupabaseRealtimeOptions<T>;
      callbackRef.current = optionsRef.current.onEvent;
    } else {
      callbackRef.current = callbackOrOptions as RealtimeCallback<T>;
      optionsRef.current = { onEvent: callbackRef.current, enabled };
    }
  }, [callbackOrOptions, enabled, isOptions]);

  useEffect(() => {
    const options = optionsRef.current!;
    const isEnabled = options.enabled !== false;

    if (!isEnabled) return;

    const supabase = createClient();

    // Remove any previous channel with the same name to avoid duplicates
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `realtime:${tableName}:${Date.now()}`;
    const channel = supabase.channel(channelName);

    const eventFilter = options.eventFilter || "*";
    const events = Array.isArray(eventFilter) ? eventFilter : [eventFilter];

    events.forEach((event) => {
      channel.on(
        "postgres_changes" as any,
        { event: event === "*" ? "*" : event, schema: "public", table: tableName },
        (payload: PostgresChangesPayload<RowPayload<T>>) => {
          const eventType = payload.eventType as EventName;
          const newRecord = payload.new as RowPayload<T> | null;
          const oldRecord = payload.old as RowPayload<T> | null;

          try {
            callbackRef.current?.({ event: eventType, newRecord, oldRecord });
          } catch (error) {
            console.error(`[useSupabaseRealtime] Callback error on ${event}:`, error);
            options.onError?.(error instanceof Error ? error : new Error(String(error)));
          }
        },
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[useSupabaseRealtime] ✓ Subscribed to ${tableName}`);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        const error = new Error(`Realtime subscription failed: ${status}`);
        console.error(`[useSupabaseRealtime] ✗ ${error.message}`);
        options.onError?.(error);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount or when tableName / enabled changes
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tableName, enabled, isOptions]);
}
