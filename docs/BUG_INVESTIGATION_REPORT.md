# Bug Investigation Report

> **Date:** 2025-12-15  
> **Investigator:** AI Agent  
> **Scope:** Store migration and PropertiesPanel split

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Overall Risk Level** | 🔴 **CRITICAL** |
| **Critical Bugs Found** | 4 |
| **Major Bugs Found** | 5 |
| **Minor Issues Found** | 8 |
| **Production Readiness** | ❌ NO - Requires Critical Bug Fixes |
| **Estimated Fix Time** | 6-8 hours |

---

## 🔴 CRITICAL BUGS (Fix Immediately)

### BUG #1: Dual History Systems - Button/Action Mismatch

**Severity:** 10/10  
**Data Loss Risk:** ✅ YES  
**Components:** `Toolbar.tsx`, `historyStore.ts`, `editorStore.ts`

**Description:**  
The Toolbar component reads `canUndo()` from `historyStore` (line 57) but calls `undo` from `editorStore` (line 61). These are **TWO COMPLETELY SEPARATE** history stacks!

```typescript
// Toolbar.tsx lines 57-62
const canUndo = useHistoryStore((s) => s.canUndo());  // ← historyStore
const canRedo = useHistoryStore((s) => s.canRedo());  // ← historyStore
const undo = useEditorStore((s) => s.undo);           // ← editorStore (DIFFERENT!)
const redo = useEditorStore((s) => s.redo);           // ← editorStore (DIFFERENT!)
```

**Steps to Reproduce:**
1. Open editor
2. Add an element via Add Text/Image (uses editorStore.addText)
3. Observe: historyStore has 0 entries, editorStore has 1 entry
4. Button shows "can undo" but clicking does nothing OR vice versa

**User Impact:** Undo/redo buttons don't match actual undo capability

**Recommended Fix:**
```typescript
// Option A: Use only editorStore
const canUndo = useEditorStore((s) => s.canUndo());
const canRedo = useEditorStore((s) => s.canRedo());

// Option B: Sync histories (more complex)
```

**Estimated Fix Time:** 30 minutes

---

### BUG #2: Undo/Redo Doesn't Sync to Specialized Stores

**Severity:** 10/10  
**Data Loss Risk:** ✅ YES (visual state corruption)  
**Components:** `editorStore.ts` undo/redo functions

**Description:**  
When user hits undo, `editorStore.undo()` restores `editorStore.elements` but does NOT sync to `elementsStore`. Components reading from `elementsStore` (LayersPanel, EditorCanvas, Toolbar) will show STALE elements.

```typescript
// editorStore.ts lines 663-676
undo: () => {
    set({
        elements: cloneDeep(snapshot.elements),  // ← Updates editorStore only!
        // ... 
    });
    // ❌ MISSING: useElementsStore.getState().setElements(...)
    // ❌ MISSING: useSelectionStore.getState().clearSelection()
}
```

**Steps to Reproduce:**
1. Add 3 elements
2. Delete one element
3. Press Undo
4. Observe: LayersPanel still shows 2 elements (reading from elementsStore)
5. EditorCanvas shows 3 elements (reading from elementsStore which wasn't synced)

**User Impact:** After undo, different parts of UI show different state

**Recommended Fix:**
```typescript
undo: () => {
    // ... existing code ...
    // Sync to specialized stores
    useElementsStore.getState().setElements(cloneDeep(snapshot.elements));
    useSelectionStore.getState().clearSelection();
    useCanvasStore.getState().setCanvasSize(snapshot.canvasSize.width, snapshot.canvasSize.height);
    useCanvasStore.getState().setBackgroundColor(snapshot.backgroundColor);
}
```

**Estimated Fix Time:** 1 hour

---

### BUG #3: Element Deletion Doesn't Sync Selection

**Severity:** 9/10  
**Data Loss Risk:** ❌ No (but causes errors)  
**Components:** `elementsStore.ts`, `selectionStore.ts`

**Description:**  
When `elementsStore.deleteElement(id)` is called, it removes the element but does NOT clear it from `selectionStore.selectedIds`. Result: ghost selection pointing to deleted element.

```typescript
// elementsStore.ts lines 152-156
deleteElement: (id) => {
    set((state) => ({
        elements: state.elements.filter((el) => el.id !== id),
    }));
    // ❌ MISSING: useSelectionStore.getState().selectedIds filter/clear
}
```

**Steps to Reproduce:**
1. Select an element
2. Delete it via LayersPanel (which uses elementsStore.deleteElement)
3. Observe: `selectionStore.selectedIds` still contains deleted ID
4. PropertiesPanel tries to access `elements.find(el => el.id === selectedId)` → undefined
5. Potential crash when accessing `undefined.x`

**User Impact:** UI errors, potential crash after deletion

**Recommended Fix:**
```typescript
deleteElement: (id) => {
    set((state) => ({
        elements: state.elements.filter((el) => el.id !== id),
    }));
    // Sync selection
    const selection = useSelectionStore.getState();
    if (selection.selectedIds.includes(id)) {
        selection.setSelectedIds(selection.selectedIds.filter(sid => sid !== id));
    }
}
```

**Estimated Fix Time:** 30 minutes

---

### BUG #4: addElement Partial Sync - Double Elements

**Severity:** 8/10  
**Data Loss Risk:** ❌ No (but corrupts state)  
**Components:** `editorStore.ts` addElement

**Description:**  
The addElement function was fixed to sync to elementsStore, but now elements are added to BOTH stores, causing potential double-counting.

```typescript
// editorStore.ts lines 193-203
addElement: (element) => {
    set((state) => ({
        elements: [...state.elements, element],  // Adds to editorStore
        selectedIds: [element.id]
    }));
    useElementsStore.getState().addElement(element);  // ALSO adds to elementsStore!
    // ...
}
```

**User Impact:** Elements may appear twice in some components, element count incorrect

**Recommended Fix:**
Either sync both ways OR make one store the source of truth AND migrate all reads to it.

**Estimated Fix Time:** 2 hours (requires architectural decision)

---

## 🟠 MAJOR BUGS (Fix Before Production)

### BUG #5: historyStore Not Used

**Severity:** 6/10  
**Components:** All stores

**Description:**  
The extracted `historyStore` is never actually used by any component or action. All history operations go through `editorStore`. The `historyStore` exists but is orphaned.

**User Impact:** Wasted code, confusion for developers

**Recommended Fix:** Either integrate historyStore fully OR delete it

---

### BUG #6: PropertiesPanel Sections Use editorStore

**Severity:** 6/10  
**Components:** All properties/ section files

**Description:**  
All 9 newly created PropertiesPanel section files still import and use `editorStore` directly. They weren't migrated to specialized stores.

**User Impact:** Sections may show inconsistent state with other components

---

### BUG #7: Canvas Size Not Synced

**Severity:** 7/10  
**Components:** `canvasStore`, `editorStore`

**Description:**  
When canvas size changes via `canvasStore.setCanvasSize()`, it doesn't sync to `editorStore`. Components reading from editorStore (legacy) see old size.

---

### BUG #8: No Template Load Sync

**Severity:** 7/10

**Description:**  
When template is loaded via `editorStore.loadTemplate()`, specialized stores are not updated. Elements, canvas size, and background from the template won't appear.

---

### BUG #9: duplicateElement Returns But Doesn't Sync Selection

**Severity:** 5/10

**Description:**  
`elementsStore.duplicateElement()` creates a new element but doesn't update `selectionStore` to select the duplicate.

---

## 🟡 MINOR ISSUES (Fix When Convenient)

1. **Missing validation** in selectionStore.selectElement() - accepts any string, even non-existent IDs
2. **No debouncing** on rapid undo/redo - could cause performance issues
3. **Console.log statements** remain in EditorCanvas.tsx (lines 106, 128, 143, 254, 293, 355)
4. **Inconsistent error handling** - some functions silently fail, others throw
5. **Missing TypeScript strict checks** on some Element updates
6. **Orphaned imports** in some section files
7. **No cleanup on component unmount** for store subscriptions
8. **History limit** (50) may be too aggressive for complex templates

---

## Architecture Concerns

### Dual State Problem

The core architectural issue is that we now have **TWO sources of truth**:
- `editorStore` (legacy monolith)
- 7 specialized stores (new, extracted)

This "bridge pattern" was supposed to be temporary but creates synchronization nightmares.

**Recommendation:**
1. **Short-term (this week):** Add bidirectional sync to ALL mutation operations
2. **Long-term (next sprint):** Fully deprecate editorStore, make specialized stores the ONLY source of truth

### Missing Synchronization Layer

There's no central coordinator for cross-store operations. Each store operates independently.

**Recommendation:** Create `useSyncedActions` hook that wraps operations and syncs all stores:
```typescript
const { addElement, deleteElement, undo, redo } = useSyncedActions();
// These functions update ALL relevant stores atomically
```

---

## Testing Gaps

| Scenario | Tested? | Risk |
|----------|---------|------|
| Add element → shows in layers | ❌ | High |
| Delete element → clears selection | ❌ | High |
| Undo → all stores sync | ❌ | Critical |
| Redo → all stores sync | ❌ | Critical |
| Load template → stores sync | ❌ | High |
| Rapid undo/redo | ❌ | Medium |
| Alignment with zoom ≠ 1 | ❌ | Medium |
| Delete during alignment | ❌ | Low |

---

## Positive Findings

✅ **Good Design Decisions:**
- Store extraction follows domain boundaries correctly
- History uses deep cloning (prevents mutation bugs)
- Each store is self-contained and testable
- TypeScript types are comprehensive

✅ **What Works:**
- Basic element CRUD (when using single store)
- Canvas rendering
- 199 existing tests still pass
- Build compiles successfully

---

## Recommendations (Prioritized)

| Priority | Action | Time | Impact |
|----------|--------|------|--------|
| 1 | Fix Toolbar undo/redo button mismatch | 30m | Critical |
| 2 | Add sync to editorStore.undo/redo | 1h | Critical |
| 3 | Add sync to elementsStore.deleteElement | 30m | Critical |
| 4 | Remove double-add from addElement | 1h | Major |
| 5 | Add sync to loadTemplate | 1h | Major |
| 6 | Migrate PropertiesPanel sections | 2h | Medium |
| 7 | Add integration tests for sync | 2h | Medium |
| 8 | Remove orphaned historyStore OR integrate | 1h | Low |

---

## Production Readiness Checklist

- [ ] All critical bugs fixed
- [ ] All major bugs fixed or documented
- [ ] Undo/redo works correctly across all UI
- [ ] Element deletion clears selection
- [ ] Template loading updates all stores
- [ ] No console.log in production
- [ ] Integration tests for sync scenarios
- [ ] Performance tested with 50+ elements

---

## Conclusion

The store extraction was technically successful but the **migration was incomplete**. The critical issue is that components now read from specialized stores while actions still update editorStore. This creates a **split-brain state** where different parts of the UI show different data.

**Immediate action required:** Spend 3-4 hours fixing critical bugs before any new feature work.

---

**Report Generated:** 2025-12-15 18:30  
**Next Review:** After critical bug fixes applied
