# GitHub Issue #1: Dual History Systems - Undo/Redo Button Mismatch

## Title
🔴 [CRITICAL] Toolbar undo/redo buttons read from wrong store

## Labels
`bug`, `critical`, `store-migration`, `undo-redo`

## Description

The Toolbar component reads `canUndo()` from `historyStore` but calls `undo` from `editorStore`. These are **two completely separate** history stacks!

### Code Location
`src/components/layout/Toolbar.tsx` (lines 57-62)

```typescript
// Current (BROKEN):
const canUndo = useHistoryStore((s) => s.canUndo());  // ← historyStore
const canRedo = useHistoryStore((s) => s.canRedo());  // ← historyStore
const undo = useEditorStore((s) => s.undo);           // ← editorStore (DIFFERENT!)
const redo = useEditorStore((s) => s.redo);           // ← editorStore (DIFFERENT!)
```

### Steps to Reproduce
1. Open editor
2. Add an element via Add Text/Image (uses editorStore.addText/addImage)
3. Observe: historyStore has 0 entries, editorStore has 1 entry
4. Button shows "can undo" but clicking does nothing OR vice versa

### Expected Behavior
Undo/redo buttons should accurately reflect whether undo/redo is possible

### Actual Behavior
Button state doesn't match actual undo capability

### Recommended Fix
```typescript
// Use same store for both button state AND action:
const canUndo = useEditorStore((s) => s.canUndo());
const canRedo = useEditorStore((s) => s.canRedo());
const undo = useEditorStore((s) => s.undo);
const redo = useEditorStore((s) => s.redo);
```

### Estimated Fix Time
30 minutes

### Acceptance Criteria
- [ ] Toolbar uses same store for canUndo and undo action
- [ ] Undo button disabled when history empty
- [ ] Redo button disabled when at latest state
- [ ] Clicking undo actually reverts last action

---

# GitHub Issue #2: Undo/Redo Doesn't Sync to Specialized Stores

## Title
🔴 [CRITICAL] Undo/redo doesn't sync elementsStore, selectionStore, canvasStore

## Labels
`bug`, `critical`, `store-migration`, `undo-redo`, `state-sync`

## Description

When user hits undo, `editorStore.undo()` restores `editorStore.elements` but does **NOT** sync to `elementsStore`. Components reading from `elementsStore` (LayersPanel, EditorCanvas, Toolbar) show stale data.

### Code Location
`src/stores/editorStore.ts` (lines 663-676)

```typescript
// Current (BROKEN):
undo: () => {
    set({
        elements: cloneDeep(snapshot.elements),  // ← Updates editorStore only!
        canvasSize: { ...snapshot.canvasSize },
        backgroundColor: snapshot.backgroundColor,
        historyIndex: newIndex,
        selectedIds: []
    });
    // ❌ MISSING: useElementsStore sync
    // ❌ MISSING: useSelectionStore sync
    // ❌ MISSING: useCanvasStore sync
}
```

### Steps to Reproduce
1. Add 3 elements (text, image, shape)
2. Delete one element
3. Press Ctrl+Z (Undo)
4. Observe: LayersPanel still shows 2 elements
5. But EditorCanvas might show 3 elements (inconsistent state)

### Expected Behavior
After undo, ALL parts of UI show the same restored state

### Actual Behavior
Different components show different element counts (split-brain state)

### Recommended Fix
```typescript
undo: () => {
    const { canUndo, history, historyIndex } = get();
    if (canUndo()) {
        const newIndex = historyIndex - 1;
        const snapshot = history[newIndex];
        
        // Update editorStore
        set({
            elements: cloneDeep(snapshot.elements),
            canvasSize: { ...snapshot.canvasSize },
            backgroundColor: snapshot.backgroundColor,
            historyIndex: newIndex,
            selectedIds: []
        });
        
        // Sync to specialized stores
        useElementsStore.getState().setElements(cloneDeep(snapshot.elements));
        useSelectionStore.getState().clearSelection();
        useCanvasStore.getState().setCanvasSize(
            snapshot.canvasSize.width, 
            snapshot.canvasSize.height
        );
        useCanvasStore.getState().setBackgroundColor(snapshot.backgroundColor);
    }
}
```

### Estimated Fix Time
1 hour

### Acceptance Criteria
- [ ] After undo, elementsStore.elements matches editorStore.elements
- [ ] After undo, selectionStore.selectedIds is cleared
- [ ] After undo, canvasStore matches snapshot
- [ ] Same behavior for redo
- [ ] LayersPanel and EditorCanvas show same elements after undo

---

# GitHub Issue #3: Element Deletion Doesn't Clear Selection

## Title
🔴 [CRITICAL] elementsStore.deleteElement doesn't sync selectionStore

## Labels
`bug`, `critical`, `store-migration`, `state-sync`

## Description

When `elementsStore.deleteElement(id)` is called, it removes the element but does **NOT** clear it from `selectionStore.selectedIds`. Result: ghost selection pointing to deleted element, potential crashes.

### Code Location
`src/stores/elementsStore.ts` (lines 152-156)

```typescript
// Current (BROKEN):
deleteElement: (id) => {
    set((state) => ({
        elements: state.elements.filter((el) => el.id !== id),
    }));
    // ❌ MISSING: selectionStore sync
}
```

### Steps to Reproduce
1. Add a text element
2. Select it
3. Delete it via LayersPanel delete button (uses elementsStore.deleteElement)
4. Observe: `selectionStore.selectedIds` still contains deleted ID
5. PropertiesPanel tries to access `elements.find(...)` → returns undefined
6. Potential crash when accessing `undefined.x`

### Expected Behavior
Deleting an element clears it from selection

### Actual Behavior
Selection persists, pointing to non-existent element

### Recommended Fix
```typescript
deleteElement: (id) => {
    set((state) => ({
        elements: state.elements.filter((el) => el.id !== id),
    }));
    
    // Sync selection - remove deleted ID
    const selection = useSelectionStore.getState();
    if (selection.selectedIds.includes(id)) {
        selection.setSelectedIds(
            selection.selectedIds.filter(sid => sid !== id)
        );
    }
}
```

### Estimated Fix Time
30 minutes

### Acceptance Criteria
- [ ] After deleteElement, selectedIds doesn't contain deleted ID
- [ ] PropertiesPanel shows "Select an element" after deletion
- [ ] No console errors after deleting selected element
- [ ] Multi-select: deleting one element removes only that ID from selection

---

# GitHub Issue #4: addElement Adds to Both Stores (Duplicate Elements)

## Title
🔴 [CRITICAL] editorStore.addElement adds to both editorStore AND elementsStore

## Labels
`bug`, `critical`, `store-migration`, `state-sync`

## Description

The `addElement` function in editorStore was patched to sync to elementsStore, but now elements are added to **BOTH** stores. This causes potential double-counting and inconsistent behavior.

### Code Location
`src/stores/editorStore.ts` (lines 193-203)

```typescript
// Current (BROKEN - double add):
addElement: (element) => {
    set((state) => ({
        elements: [...state.elements, element],  // Adds to editorStore
        selectedIds: [element.id]
    }));
    useElementsStore.getState().addElement(element);  // ALSO adds to elementsStore!
    useSelectionStore.getState().selectElement(element.id);
}
```

### Steps to Reproduce
1. Open editor (fresh state)
2. Add a text element
3. Check `editorStore.elements.length` → 1
4. Check `elementsStore.elements.length` → 1
5. Both have the element (seems fine)
6. BUT: If any component reads from one and writes to other, counts diverge

### Expected Behavior
Single source of truth for elements array

### Actual Behavior
Two separate arrays that can get out of sync

### Recommended Fix

**Option A (Quick Fix):** Don't update editorStore, only update specialized stores
```typescript
addElement: (element) => {
    // Only sync to specialized stores
    useElementsStore.getState().addElement(element);
    useSelectionStore.getState().selectElement(element.id);
    // Legacy components reading from editorStore will see stale data (acceptable during migration)
}
```

**Option B (Better):** Make elementsStore the source of truth, have editorStore.elements compute from it
```typescript
// In editorStore, subscribe to elementsStore
// Or use Zustand's `get()` to read from elementsStore
```

### Estimated Fix Time
1-2 hours (requires architectural decision)

### Acceptance Criteria
- [ ] Elements exist in exactly ONE source of truth
- [ ] All components read from same source
- [ ] No duplicate elements after adding
- [ ] Adding 5 elements results in exactly 5 elements total
