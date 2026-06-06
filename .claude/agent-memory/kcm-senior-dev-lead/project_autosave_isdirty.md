---
name: project_autosave_isdirty
description: TASK-10 — isDirty state pattern chosen for autosave hydration guard in ReportScreen
metadata:
  type: project
---

The `hydrated = useRef(false)` guard in `app/report/[id].tsx` was replaced with `const [isDirty, setIsDirty] = useState(false)`.

**Pattern:**
- `setIsDirty(true)` is called at the start of every user-initiated mutation: `updateReport`, `updateWorkItem`, `addWorkItem`, `removeWorkItem`.
- `setIsDirty(false)` is called at the end of `load()` (after all state setters), so re-focusing the screen does not trigger a spurious autosave.
- The autosave `useEffect` guard is `if (!isDirty || !report) return`.
- `isDirty` is added to the effect dependency array.

**Why:** `useRef` mutations and `useEffect` runs are not strictly ordered under React's concurrent scheduler. A state batch could trigger the autosave effect with `hydrated.current` still `false` even though data had loaded. Using `useState` for the guard ensures the scheduler's batching model keeps the flag and the effect consistent.

**How to apply:** Whenever an autosave or side-effect should only fire after user interaction (not on initial load or re-focus), use a `isDirty` state flag rather than a ref.

Related: [[project_quality_audit_2026_06]]
