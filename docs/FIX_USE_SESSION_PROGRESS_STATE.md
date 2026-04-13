# 🔧 Fix: useSessionProgress setState During Render Warning (Second Issue)

## Issue

```
Cannot update a component (`Router`) while rendering a different component (`ClinicalClient`). 
To locate the bad setState() call inside `ClinicalClient`, follow the stack trace as described 
in https://react.dev/link/setstate-in-render

at saveTreatmentHistoryAction (src/features/clinical/serverActions.ts:418:23)
```

## Root Cause

In `useSessionProgress.ts`, the `updateItemStatus` function had a **side effect inside a `setState` updater**:

```typescript
// ❌ PROBLEMATIC
setState((prev) => {
  const updatedPlan = prev.plan.map(/* ... */);
  const updatedHistory = [newRecord, ...prev.history];

  // ❌ SIDE EFFECT INSIDE setState UPDATER!
  if (patientId) {
    saveTreatmentHistoryAction(patientId, updatedHistory).catch(/* ... */);
  }

  return { plan: updatedPlan, history: updatedHistory };
});
```

**Why this caused the warning:**

1. `setState` updaters should be **pure functions** (no side effects)
2. Calling `saveTreatmentHistoryAction` (an async server action) inside the updater violates this rule
3. React may call updaters multiple times during render for consistency checks
4. This triggers the "setState during render" warning because the side effect executes during React's render phase

## Solution

**Separated the side effect from the state update:**

```typescript
// ✅ FIXED
// Calculate the updated plan and history WITHOUT side effects in setState
const updatedPlan = state.plan.map((item) =>
  item.id === itemId
    ? {
        ...item,
        status: newStatus,
        completedAt: newStatus === TreatmentStatus.COMPLETED
          ? new Date().toISOString()
          : undefined,
      }
    : item,
);

const updatedHistory: CompletionRecord[] = [newRecord, ...state.history];

// Update state (pure updater — no side effects)
setState({ plan: updatedPlan, history: updatedHistory });

// Persist the updated history to DB (separate from setState)
if (patientId) {
  await saveTreatmentHistoryAction(patientId, updatedHistory);
}
```

**Key changes:**

1. ✅ **Calculated new state values before calling `setState`**
2. ✅ **Used `setState` with a plain object (not a function)**
3. ✅ **Called `saveTreatmentHistoryAction` AFTER `setState`, not inside it**
4. ✅ **Made the state updater pure (no side effects)**
5. ✅ **Added `state.history` to dependency array** (was missing before)

## Why This Works

### React's Rules for State Updaters

From the React docs:
> setState updater functions should be **pure**. React may call them multiple times.

**What this means:**
- ✅ Updaters should only calculate and return new state
- ❌ No API calls, no database writes, no mutations
- ❌ No async operations
- ❌ No calling other setState functions

### The Correct Pattern

```typescript
// ❌ WRONG: Side effect inside setState
setState((prev) => {
  const newState = calculateNewState(prev);
  doSomethingAsync();  // ← Side effect!
  return newState;
});

// ✅ RIGHT: Separate side effect from setState
const newState = calculateNewState(state);
setState(newState);
await doSomethingAsync();  // ← Side effect outside setState
```

## Files Changed

| File | Change |
|------|--------|
| `src/features/clinical/hooks/useSessionProgress.ts` | Moved `saveTreatmentHistoryAction` call outside `setState` updater |
| | Added `state.history` to dependency array |
| | Changed from function updater to direct object update |

## Additional Fixes in This File

### Missing Dependency Added

The `useCallback` dependency array was missing `state.history`:

```typescript
// ❌ Before
[state.plan, patientId, addOptimisticUpdate]

// ✅ After
[state.plan, state.history, patientId, addOptimisticUpdate]
```

This ensures the callback is recreated when `state.history` changes, preventing stale closures.

## Testing

To verify the fix:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open the clinical page:
   ```
   http://localhost:3000/ar/clinical
   ```

3. Select a patient

4. Change a treatment item status (e.g., PLANNED → IN_PROGRESS → COMPLETED)

5. **Expected**:
   - No "setState during render" warning in console
   - Status updates instantly (optimistic UI)
   - Treatment history saves to database
   - Odontogram colors update correctly
   - No React warnings

6. Complete multiple treatments

7. **Expected**:
   - Each completion saves to history
   - No duplicate saves or missed saves
   - Console shows no errors

## Benefits

✅ **No More Warning**: Eliminates the "setState during render" issue  
✅ **Pure Updaters**: State updaters now follow React best practices  
✅ **Better Performance**: No redundant side effect calls from React retries  
✅ **Correct Dependencies**: `state.history` in dependency array prevents stale closures  
✅ **Maintainable**: Clear separation of state updates and side effects  

## Related Issues

This is the **second instance** of the same warning. The first was fixed by:
- Adding `key` prop to `ClinicalClient` in `clinical/page.tsx`
- Removing the prop-sync `useEffect` in `ClinicalClient.tsx`

Both fixes address different code paths that violated React's rules about render-phase updates.

## Best Practices Learned

### 1. Keep State Updaters Pure

```typescript
// ✅ Good
setState({ count: state.count + 1 });

// ❌ Bad
setState((prev) => {
  logToAnalytics(prev.count + 1);  // ← Side effect!
  return { count: prev.count + 1 };
});
```

### 2. Separate Side Effects

```typescript
// ✅ Good
const newValue = calculateNewValue(state);
setState(newValue);
await persistToDatabase(newValue);

// ❌ Bad
setState((prev) => {
  const newValue = calculateNewValue(prev);
  persistToDatabase(newValue);  // ← Inside updater!
  return newValue;
});
```

### 3. Complete Dependency Arrays

```typescript
// ✅ Good
useCallback(() => {
  doSomething(state.a, state.b);
}, [state.a, state.b]);

// ❌ Bad
useCallback(() => {
  doSomething(state.a, state.b);  // ← state.b missing from deps!
}, [state.a]);
```

---

**Fixed**: April 8, 2026  
**Status**: ✅ Resolved  
**Build Status**: Compiles successfully
