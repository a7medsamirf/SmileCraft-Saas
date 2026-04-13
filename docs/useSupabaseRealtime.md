# useSupabaseRealtime Hook

Production-ready React hook for subscribing to Supabase Realtime database changes with full TypeScript support.

## Features

- ✅ **Full Type Safety**: Generic types ensure payload matches your Prisma schema
- ✅ **Automatic Cleanup**: Unsubscribes on unmount to prevent memory leaks
- ✅ **Event Filtering**: Subscribe to specific events (INSERT, UPDATE, DELETE) or all
- ✅ **Error Handling**: Built-in error handling with custom callbacks
- ✅ **Flexible API**: Support both simple callback and options object
- ✅ **Multiple Subscriptions**: Safe to use multiple times without channel conflicts

## Installation

No additional dependencies required. Uses existing:
- `@supabase/supabase-js`
- React 19
- TypeScript

## Usage

### Basic Usage (Simple Callback)

```tsx
"use client";

import { useSupabaseRealtime } from "@/hooks";
import type { Database } from "@/types/database.types";

function AppointmentsList() {
  useSupabaseRealtime("appointments", ({ event, newRecord, oldRecord }) => {
    console.log(`Event: ${event}`, newRecord || oldRecord);
    // Refetch data or update local state
  });

  return <div>...</div>;
}
```

### Advanced Usage (Options Object)

```tsx
"use client";

import { useSupabaseRealtime } from "@/hooks";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

function PatientsTable() {
  const [patients, setPatients] = useState<Patient[]>([]);

  const handlePatientChange = useCallback(({ event, newRecord, oldRecord }) => {
    if (event === "INSERT" && newRecord) {
      setPatients((prev) => [...prev, newRecord]);
      toast.success(`Patient added: ${newRecord.fullName}`);
    } else if (event === "UPDATE" && newRecord) {
      setPatients((prev) =>
        prev.map((p) => (p.id === newRecord.id ? newRecord : p))
      );
    } else if (event === "DELETE" && oldRecord) {
      setPatients((prev) => prev.filter((p) => p.id !== oldRecord.id));
      toast.info("Patient removed");
    }
  }, []);

  useSupabaseRealtime("patients", {
    onEvent: handlePatientChange,
    enabled: true, // Optional: enable/disable subscription
    eventFilter: ["INSERT", "UPDATE", "DELETE"], // Or just "INSERT"
    onError: (error) => {
      console.error("Realtime error:", error);
      toast.error("Failed to sync real-time updates");
    },
  });

  return <div>...</div>;
}
```

### Real-World Example: Appointments Page

This is the exact implementation in `DailyAgenda.tsx`:

```tsx
"use client";

import { useSupabaseRealtime } from "@/hooks";
import { useCallback, useState, useEffect } from "react";
import { getAppointmentsByDateAction } from "../serverActions";

export function DailyAgenda({ selectedDate = new Date() }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      const data = await getAppointmentsByDateAction(selectedDate);
      setAppointments(data);
    };
    load();
  }, [selectedDate]);

  // Realtime subscription - auto-refetch on changes
  const handleAppointmentChange = useCallback(async () => {
    const data = await getAppointmentsByDateAction(selectedDate);
    setAppointments(data);
  }, [selectedDate]);

  useSupabaseRealtime("appointments", {
    onEvent: handleAppointmentChange,
    onError: (error) => {
      console.error("Realtime error:", error);
      toast.error("فشل في تحديث البيانات مباشرة");
    },
  });

  return (
    <div>
      {/* Render appointments - updates in real-time */}
      {appointments.map((apt) => (
        <AppointmentCard key={apt.id} appointment={apt} />
      ))}
    </div>
  );
}
```

### Conditional Subscription

```tsx
function Dashboard() {
  const [isLiveUpdatesEnabled, setIsLiveUpdatesEnabled] = useState(true);

  useSupabaseRealtime("payments", {
    onEvent: ({ event, newRecord }) => {
      if (event === "INSERT" && newRecord) {
        playPaymentSound();
        refreshPayments();
      }
    },
    enabled: isLiveUpdatesEnabled, // Toggle subscription
  });

  return (
    <div>
      <button onClick={() => setIsLiveUpdatesEnabled(!isLiveUpdatesEnabled)}>
        {isLiveUpdatesEnabled ? "Disable" : "Enable"} Live Updates
      </button>
    </div>
  );
}
```

### Multiple Table Subscriptions

```tsx
function ClinicDashboard() {
  useSupabaseRealtime("appointments", {
    onEvent: () => refreshAppointments(),
  });

  useSupabaseRealtime("patients", {
    onEvent: () => refreshPatients(),
  });

  useSupabaseRealtime("payments", {
    onEvent: ({ event, newRecord }) => {
      if (event === "INSERT") handleNewPayment(newRecord);
    },
  });

  return <DashboardContent />;
}
```

## API

### Signature

```typescript
// Simple callback API
function useSupabaseRealtime<T extends TableName>(
  tableName: T,
  callback: RealtimeCallback<T>,
  enabled?: boolean,
): void;

// Options API (recommended for advanced usage)
function useSupabaseRealtime<T extends TableName>(
  tableName: T,
  options: UseSupabaseRealtimeOptions<T>,
): void;
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tableName` | `keyof Database["public"]["Tables"]` | Name of the database table to subscribe to |
| `callback` | `RealtimeCallback<T>` | Function called on every event |
| `options.onEvent` | `RealtimeCallback<T>` | Event callback (options API) |
| `options.enabled` | `boolean` (optional) | Enable/disable subscription (default: `true`) |
| `options.eventFilter` | `EventName \| EventName[]` (optional) | Filter by event type(s) (default: `"*"`) |
| `options.onError` | `(error: Error) => void` (optional) | Custom error handler |

### Types

```typescript
type TableName = keyof Database["public"]["Tables"];
type EventName = "INSERT" | "UPDATE" | "DELETE";

type RealtimeCallback<T extends TableName> = (payload: {
  event: EventName;
  newRecord: Database["public"]["Tables"][T]["Row"] | null;
  oldRecord: Database["public"]["Tables"][T]["Row"] | null;
}) => void;

interface UseSupabaseRealtimeOptions<T extends TableName> {
  onEvent: RealtimeCallback<T>;
  enabled?: boolean;
  eventFilter?: EventName | EventName[];
  onError?: (error: Error) => void;
}
```

## Type Safety

The hook automatically infers the correct row type from your database schema:

```typescript
// ✅ newRecord is typed as Database["public"]["Tables"]["appointments"]["Row"]
useSupabaseRealtime("appointments", ({ event, newRecord }) => {
  if (newRecord) {
    console.log(newRecord.id); // string
    console.log(newRecord.status); // AppointmentStatus
    console.log(newRecord.date); // string (ISO date)
  }
});

// ✅ newRecord is typed as Database["public"]["Tables"]["patients"]["Row"]
useSupabaseRealtime("patients", ({ newRecord }) => {
  if (newRecord) {
    console.log(newRecord.fullName); // string
    console.log(newRecord.phone); // string
  }
});
```

## How It Works

1. **Channel Creation**: Creates a unique Supabase channel per subscription
2. **Event Subscription**: Subscribes to `postgres_changes` events on the specified table
3. **Callback Execution**: Calls your callback with typed payload on every event
4. **Cleanup**: Automatically removes channel on unmount or when dependencies change
5. **Duplicate Prevention**: Removes old channels before creating new ones

## Supabase Setup Requirements

### 1. Enable Realtime in Supabase Dashboard

Go to **Database → Replication** and enable Realtime for your tables:

```sql
-- Enable publication for specific table
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE clinical_cases;
```

### 2. Verify Publication

Check if your tables are being published:

```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### 3. Row Level Security (RLS)

Realtime respects RLS policies. Ensure authenticated users have proper access:

```sql
-- Example: Allow authenticated users to read appointments
CREATE POLICY "Users can view appointments"
ON appointments FOR SELECT
TO authenticated
USING (true);
```

## Best Practices

### ✅ DO

- Use `useCallback` for event handlers to prevent unnecessary re-subscriptions
- Refetch data from server actions instead of relying solely on realtime payload
- Add error handling with `onError` callback
- Use `eventFilter` to reduce unnecessary callback executions
- Disable subscription when component is not visible (`enabled: isVisible`)

### ❌ DON'T

- Don't mutate local state directly with realtime payload (always refetch for consistency)
- Don't forget to handle errors (at least log them)
- Don't create subscriptions in loops without proper cleanup
- Don't use for high-frequency tables without considering performance

## Performance Considerations

- **Memory**: Each subscription creates a WebSocket channel. Always cleanup on unmount.
- **Network**: Realtime uses persistent WebSocket connection. Multiple hooks share the same connection.
- **Re-renders**: Use `useCallback` to prevent unnecessary re-subscriptions on every render.
- **Batching**: If you need multiple tables, consider creating a single hook that handles all events.

## Troubleshooting

### "Subscription not receiving events"

1. Check if Realtime is enabled for the table in Supabase Dashboard
2. Verify RLS policies allow the authenticated user to read the table
3. Check browser console for subscription status logs
4. Ensure environment variables are correct:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   ```

### "Memory leak warnings"

The hook handles cleanup automatically. If you see warnings:
- Ensure you're not creating channels manually outside the hook
- Check if component is unmounting and remounting rapidly

### "Type errors with payload"

Ensure table name is a valid key of your database types:

```typescript
// ✅ Correct - uses exact table name from database.types.ts
useSupabaseRealtime("appointments", callback);

// ❌ Wrong - typo or non-existent table
useSupabaseRealtime("appointment", callback); // Error!
```

## Related Files

- Hook Implementation: `src/hooks/useSupabaseRealtime.ts`
- Supabase Client: `src/lib/supabase/client.ts`
- Database Types: `src/types/database.types.ts`
- Example Usage: `src/features/appointments/components/DailyAgenda.tsx`

## See Also

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [React Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [PostgreSQL Publication](https://www.postgresql.org/docs/current/sql-createpublication.html)
