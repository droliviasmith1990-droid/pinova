# Finding #1: Dual Store Architecture - Decision Document

> **Date:** 2025-12-15  
> **Author:** AI Architect  
> **Status:** DECISION MADE

---

## Current State Analysis

### Store Usage Matrix

| Component | editorStore | elementsStore | selectionStore | canvasStore | Migration % |
|-----------|-------------|---------------|----------------|-------------|-------------|
| **PropertiesPanel.tsx** | ✓ | ✗ | ✗ | ✗ | 0% |
| **TextPropertiesSection** | ✓ | ✗ | ✗ | ✗ | 0% |
| **PositionSection** | ✓ | ✗ | ✗ | ✗ | 0% |
| **LayerOrderSection** | ✓ | ✗ | ✗ | ✗ | 0% |
| **ImagePropertiesSection** | ✓ | ✗ | ✗ | ✗ | 0% |
| **EffectsSection** | ✓ | ✗ | ✗ | ✗ | 0% |
| **DynamicDataSection** | ✓ | ✗ | ✗ | ✗ | 0% |
| **AppearanceSection** | ✓ | ✗ | ✗ | ✗ | 0% |
| **AlignmentSection** | ✓ | ✗ | ✗ | ✗ | 0% |
| **LayersPanel** | ✓ | ✓ | ✓ | ✓ | 75% |
| **FontLibraryPanel** | ✓ | ✗ | ✗ | ✗ | 0% |
| **CanvasSizePanel** | ✓ | ✗ | ✗ | ✗ | 0% |
| **CanvasSizeSection** | ✗ | ✓ | ✗ | ✓ | 100% |
| **Toolbar** | ✓ | ✓ | ✓ | ✓ | 60% |
| **RightPanel** | ✓ | ✗ | ✗ | ✗ | 0% |
| **LeftSidebar** | ✓ | ✗ | ✗ | ✗ | 0% |
| **Header** | ✓ | ✓ | ✗ | ✓ | 40% |
| **CanvasArea** | ✓ | ✗ | ✗ | ✗ | 0% |
| **CanvaImportModal** | ✓ | ✗ | ✗ | ✗ | 0% |
| **TemplateGallery** | ✓ | ✗ | ✗ | ✗ | 0% |
| **EditorCanvas** | ✓ | ✓ | ✓ | ✓ | 70% |
| **ContextMenu** | ✓ | ✓ | ✓ | ✗ | 50% |

### Summary Statistics

- **Total components using editorStore:** 21
- **Components using specialized stores:** 6
- **Components ONLY on specialized stores:** 1 (CanvasSizeSection)
- **Dual-store components (highest risk):** 5 (LayersPanel, Toolbar, Header, EditorCanvas, ContextMenu)
- **Average migration percentage:** ~25%

### Functions Still in editorStore (No Specialized Alternative)

| Function | Used By | Must Keep In editorStore? |
|----------|---------|---------------------------|
| `addText()` | Toolbar, LeftSidebar | ✓ (complex element creation with history) |
| `addImage()` | Toolbar, LeftSidebar | ✓ (complex element creation with history) |
| `addShape()` | Toolbar | ✓ (complex element creation with history) |
| `loadTemplate()` | Header, LeftSidebar, TemplateGallery | ✓ (coordinates multiple stores) |
| `undo()` / `redo()` | Toolbar, keyboard | ✓ (manages history snapshots) |
| `pushHistory()` | Many components | ✓ (history coordination) |
| `reorderElements()` | LayersPanel | Could move to layersStore |
| `moveElement*()` | ContextMenu, LayerOrderSection | Could move to layersStore |
| `alignElement()` | ContextMenu | Could move to alignmentStore |
| `copyElement()` / `pasteElement()` | ContextMenu | Could move to clipboardStore |
| `duplicateElement()` | EditorCanvas, ContextMenu | Uses history coordination |

---

## Approach Evaluation

### APPROACH A: Complete Deprecation of editorStore

**Effort:** 16-24 hours  
**Risk Level:** HIGH  
**Breaking Change Risk:** HIGH

**Pros:**
- Clean architecture
- Single source of truth
- No sync complexity

**Cons:**
- Must create new stores for: history, clipboard, element creation
- Must migrate ALL 21 components
- High risk of breaking functionality
- Complex functions (addText with zIndex calculation) need careful porting

**Verdict:** Too risky for current timeline. Defer to next major refactor.

---

### APPROACH B: editorStore as Facade (RECOMMENDED)

**Effort:** 4-6 hours  
**Risk Level:** LOW  
**Breaking Change Risk:** NONE

**Concept:**
- editorStore KEEPS its external API (no breaking changes)
- Internally, editorStore READS from specialized stores
- Internally, editorStore WRITES to specialized stores
- Components can use EITHER interface
- Gradual migration becomes optional

**Implementation:**
```typescript
// BEFORE: editorStore manages its own elements
addElement: (element) => {
    set((state) => ({
        elements: [...state.elements, element], // Own state
    }));
}

// AFTER: editorStore delegates to specialized store
addElement: (element) => {
    useElementsStore.getState().addElement(element);  // Delegate
    // Sync local copy from source of truth
    set({ elements: useElementsStore.getState().elements });
}

// AFTER: State reads from specialized store
get elements() {
    return useElementsStore.getState().elements;  // Always fresh
}
```

**Pros:**
- Zero breaking changes
- Components continue working unchanged
- Specialized stores become source of truth
- Gradual migration becomes optional optimization
- Low effort, low risk

**Cons:**
- Still have two "interfaces" (but one source of truth)
- editorStore file stays large (but simpler internally)
- Pattern must be documented clearly

**Verdict:** Best balance of risk/reward. Implement this.

---

### APPROACH C: Complete Reversal

**Effort:** 2 hours  
**Risk Level:** LOW  
**Value:** NEGATIVE (loses all refactoring work)

**Verdict:** Unacceptable. Wastes previous work, doesn't solve original problem.

---

## DECISION: APPROACH B (Facade Pattern)

### Reasoning

1. **Risk Minimization:** No component changes required
2. **Source of Truth:** Specialized stores become authoritative
3. **Incremental:** Can migrate components later as optional improvement
4. **Reversible:** If problems arise, easy to revert
5. **Time Efficient:** 4-6 hours vs 16-24 hours

### Implementation Plan

#### Phase 1: Elements Facade (1.5 hours)
Make editorStore.elements read from elementsStore:
- `get elements()` returns `elementsStore.elements`
- `addElement()` delegates to `elementsStore.addElement()`
- `updateElement()` delegates to `elementsStore.updateElement()`
- `deleteElement()` delegates to `elementsStore.deleteElement()`
- `duplicateElement()` delegates then syncs
- `setElements()` delegates

#### Phase 2: Selection Facade (30 min)
Make editorStore.selectedIds read from selectionStore:
- `get selectedIds()` returns `selectionStore.selectedIds`
- `selectElement()` delegates
- `toggleSelection()` delegates

#### Phase 3: Canvas Facade (30 min)
Make editorStore canvas state read from canvasStore:
- `get canvasSize()` returns `canvasStore.canvasSize`
- `get backgroundColor()` returns `canvasStore.backgroundColor`
- `get zoom()` returns `canvasStore.zoom`
- `setCanvasSize()` delegates
- `setBackgroundColor()` delegates
- `setZoom()` delegates

#### Phase 4: loadTemplate Fix (30 min)
Update loadTemplate to initialize all specialized stores:
- Set elementsStore.elements
- Set canvasStore size/background
- Clear selectionStore
- Reset history

#### Phase 5: Testing & Validation (1 hour)
- Run all 199 tests
- Manual testing of all features
- Verify no regressions

### Rollback Plan

If facade pattern causes issues:
1. Git revert facade commits
2. Return to current sync-on-action pattern
3. Reassess approach

### Success Criteria

- [ ] All 199 tests passing
- [ ] No behavioral changes for users
- [ ] elementsStore is source of truth for elements
- [ ] selectionStore is source of truth for selection
- [ ] canvasStore is source of truth for canvas config
- [ ] loadTemplate works correctly with all stores
- [ ] Documentation updated

---

## Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Elements Facade | 1.5h | 1.5h |
| Phase 2: Selection Facade | 0.5h | 2h |
| Phase 3: Canvas Facade | 0.5h | 2.5h |
| Phase 4: loadTemplate Fix | 0.5h | 3h |
| Phase 5: Testing | 1h | 4h |
| **Total** | **4 hours** | |

---

## Dependencies on Other Findings

- **Finding #2 (22 components):** NOT REQUIRED - facade pattern means no component changes
- **Finding #3 (orphaned historyStore):** Can DELETE - history stays in editorStore
- **Finding #4 (auto-save):** INDEPENDENT - implement after facade
- **Finding #5 (loadTemplate sync):** INCLUDED in Phase 4

---

**Decision Made:** 2025-12-15 18:50  
**Implementation Start:** Immediately
