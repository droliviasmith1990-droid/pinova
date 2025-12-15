# Technical Debt Analysis

> **Created:** 2025-12-15  
> **Analysis Date:** 2025-12-15  
> **Codebase:** Pinterest Editor (Fabric.js)  
> **Total Issues Identified:** 23

---

## 📊 Executive Summary

### Critical Findings

| Category | Count | Severity | Priority |
|----------|-------|----------|----------|
| God Components | 5 | 🔴 Critical | P1 |
| Missing Abstractions | 4 | 🟡 Medium | P2 |
| Testing Gaps | 0 tests | 🔴 Critical | P1 |
| TypeScript Issues | 0 (strict ✅) | 🟢 Good | - |
| Performance Risks | 3 | 🟠 High | P2 |
| Documentation Gaps | 8 | 🟡 Medium | P3 |

### Largest Files (Lines of Code)

1. **editorStore.ts** - 1,178 lines ⚠️ CRITICAL |
2. **PropertiesPanel.tsx** - 895 lines ⚠️ CRITICAL
3. **CanvasManager.ts** - 824 lines ⚠️ CRITICAL
4. **BulkActions.tsx** - 254 lines ⚠️ WARNING
5. **csvValidator.ts** - 228 lines ⚠️ WARNING

### Good News ✅

- **TypeScript Strict Mode:** ENABLED (this is excellent!)
- **No lodash imports:** No optimization needed
- **No papaparse/jszip imports found:** Likely lazy-loaded or not yet implemented
- **Modern Next.js 16:** App Router, React 19

---

## 🔴 SMELL 1: GOD COMPONENTS

### 1.1 editorStore.ts - THE MEGASTORE (1,178 LINES) 🚨 CRITICAL

**Location:** `src/stores/editorStore.ts`

**Current State:**
- **1,178 lines** of code in a single file
- **62 functions/methods** (from outline)
- **16+ distinct responsibilities**

**Responsibilities Identified:**
1. Template metadata (id, name, source)
2. Canvas configuration (size, background, zoom)
3. Elements array management
4. Selection management (single + multi-select)
5. History management (undo/redo with 50 item limit)
6. Clipboard operations (copy/paste elements)
7. Style clipboard (copy/paste styles)
8. Element CRUD operations (add, update, delete, duplicate)
9. Layer ordering (forward, backward, front, back)
10. Alignment operations (align to canvas, align selected)
11. Distribution operations (horizontal, vertical)
12. Template operations (load, save, reset)
13. Elements array management
14. Visibility/lock state
15. Dynamic data management (CSV data, current row, preview mode)
16. Save state tracking (is saving, is new template)

**Problems:**
- **Violates Single Responsibility Principle** - 16 different concerns
- **Hard to test** - Can't test alignment logic without entire store
- **Hard to navigate** - 1,178 lines too much to cognitively load
- **Performance risk** - Large store means more re-renders if not carefully optimized
- **Collaboration conflict** - Multiple developers can't work on different features
- **State bloat** - Some state might be better local (UI-only state)

**Proposed Split Strategy:**

```
editorStore.ts (current 1,178 lines) → 7 stores:

1. templateStore.ts (150 lines)
   - templateId, templateName, isNewTemplate
   - loadTemplate, resetToNewTemplate, setTemplateName
   - templates array (gallery)
   
2. canvasStore.ts (100 lines)
   - canvasSize, backgroundColor, zoom
   - setCanvasSize, setBackgroundColor, setZoom
   
3. elementsStore.ts (200 lines)
   - elements array
   - addElement, updateElement, deleteElement
   - Core CRUD only
   
4. selectionStore.ts (100 lines)
   - selectedIds
   - selectElement, toggleSelection, deselectAll
   
5. historyStore.ts (150 lines)
   - history.past, history.future
   - undo, redo, pushHistory, canUndo, canRedo
   - Snapshot logic
   
6. layersStore.ts (250 lines)
   - All layer ordering functions
   - moveElementForward, moveElementBackward, etc.
   - reorderElements
   
7. alignmentStore.ts (200 lines)
   - All alignment functions
   - alignElement, alignSelectedElements
   - distributeSelectedElements
```

**Benefits:**
- Each store has ONE clear purpose
- Easy to test (mock one store at a time)
- Better code organization
- Parallel development (team can work on different stores)
- Selective subscriptions (components only subscribe to what they need)

**Effort Estimate:** 16 hours
- Hour 1-2: Plan store boundaries, define interfaces
- Hour 3-6: Extract templateStore + canvasStore (safest, least dependencies)
- Hour 7-10: Extract elementsStore + selectionStore
- Hour 11-14: Extract historyStore + layersStore
- Hour 15-16: Extract alignmentStore, test everything

**Dependencies:** None (can start immediately)

**Risk Level:** HIGH
- **Risk:** Breaking undo/redo (depends on entire state)
- **Mitigation:** Extract stores one at a time, keep tests running
- **Rollback Plan:** Git revert after each store extraction

**Success Criteria:**
- [ ] 7 separate store files created
- [ ] Each file < 300 lines
- [ ] All existing functionality preserved
- [ ] Undo/redo still works
- [ ] Performance maintained or improved
- [ ] No circular dependencies between stores

**Priority:** 🔴 CRITICAL - Blocking scaling

---

### 1.2 PropertiesPanel.tsx - THE CONTROL PANEL (895 LINES) 🚨 CRITICAL

**Location:** `src/components/panels/PropertiesPanel.tsx`

**Current State:**
- **895 lines** in single component file
- **16 functions/components** (from outline)
- **8+ distinct UI sections**

**Components Identified:**
1. `PropertiesPanel` (main component) - Lines 25-401 (377 lines!)
2. `PropertyInput` - Number input with label
3. `TextPropertiesSection` - Font, size, color, alignment (105 lines)
4. `ImagePropertiesSection` - Replace image, filters (42 lines)
5. `EffectsSection` - Shadow, outline, background (230 lines!)
6. `StyleButton` - Style preset button
7. `Accordion` - Collapsible section
8. `SliderRow` - Slider with label and value

**Sections in PropertiesPanel:**
- Layer order controls (Front, Back, Forward, Backward)
- Align to page (6 buttons + 2 distribute buttons)
- Position section (X, Y inputs)
- Size section (W, H, rotation)
- Appearance (opacity slider)
- Text properties (conditional on element type)
- Image properties (conditional on element type)
- Effects section

**Problems:**
- **God component** - Too many responsibilities
- **Conditional rendering hell** - Different UI for text vs image vs shape
- **Hard to reuse** - Can't use "Position section" elsewhere
- **Testing nightmare** - Must render entire panel to test one section
- **Performance** - Entire panel re-renders on any property change
- **EffectsSection alone is 230 lines** - Another god component inside!

**Proposed Split:**

```
PropertiesPanel.tsx (100 lines) - Container ONLY
├── sections/ (new folder)
│   ├── LayerOrderSection.tsx (80 lines)
│   ├── AlignmentSection.tsx (120 lines)
│   ├── PositionSection.tsx (60 lines)
│   ├── SizeSection.tsx (80 lines)
│   ├── AppearanceSection.tsx (50 lines)
│   ├── TextPropertiesSection.tsx (150 lines) - moved
│   ├── ImagePropertiesSection.tsx (100 lines) - moved
│   └── EffectsSection.tsx (250 lines) - needs further split!
├── inputs/ (new folder)
│   ├── PropertyInput.tsx (moved)
│   ├── SliderRow.tsx (moved)
│   └── StyleButton.tsx (moved)
└── ui/
    └── Accordion.tsx (moved to primitives/)
```

**EffectsSection Further Split:**
```
EffectsSection.tsx (60 lines) - Container
├── ShadowControls.tsx (80 lines)
├── OutlineControls.tsx (60 lines)
└── BackgroundControls.tsx (50 lines)
```

**Benefits:**
- Each section is independent, reusable
- Easy to test individual sections
- Better code organization (logical grouping)
- Can lazy-load sections (performance boost)
- Parallel development (multiple devs work on different sections)
- React.memo on sections prevents unnecessary re-renders

**Effort Estimate:** 12 hours
- Hour 1-2: Create folder structure, extract helper components (Accordion, inputs)
- Hour 3-5: Extract simpler sections (Position, Size, Appearance)
- Hour 6-8: Extract complex sections (Alignment, LayerOrder)
- Hour 9-11: Extract TextProperties, ImageProperties
- Hour 12: Refactor EffectsSection, test

**Dependencies:** None

**Risk Level:** MEDIUM
- **Risk:** Breaking property updates
- **Mitigation:** Extract one section at a time, test after each
- **Rollback:** Git commits per section

**Success Criteria:**
- [ ] PropertiesPanel.tsx < 150 lines
- [ ] Each section in separate file
- [ ] All sections independently testable
- [ ] Property updates still work
- [ ] Performance improved (React.memo on sections)

**Priority:** 🔴 CRITICAL - Blocking UI development

---

### 1.3 CanvasManager.ts - THE CANVAS CONTROLLER (824 LINES) 🚨 CRITICAL

**Location:** `src/lib/canvas/CanvasManager.ts`

**Current State:**
- **824 lines** in single class file
- **36+ methods** (from outline)
- **10+ responsibilities**

**Responsibilities:**
1. Canvas initialization & lifecycle
2. Fabric.js event binding/unbinding
3. Element CRUD (add, update, remove, replace all)
4. Fabric object creation (text, image, shape, frame)
5. Element selection management
6. Zoom management
7. Alignment guides integration
8. Spatial hash grid integration (collision detection)
9. Snapping settings management
10. Callback registration (element changes, selection changes)
11. Performance metrics tracking
12. Error handling

**Key Methods:**
- `initialize()` - 63 lines
- `destroy()` - 38 lines
- `addElement()` - 38 lines
- `updateElement()` - 34 lines
- `removeElement()` - 26 lines
- `replaceAllElements()` - 45 lines
- `createFabricObject()` - 72 lines (likely larger with all element types)
- `bindEvents()` - 15 lines (but complex logic)
- Plus 20+ other methods

**Problems:**
- **God class** - Too many concerns
- **Hard to test** - Mock Fabric.js canvas in tests
- **Hard to extend** - Adding new element type requires editing large file
- **Coupling** - Tightly coupled to Fabric.js (hard to swap libraries)
- **Performance metrics mixed with core logic** - Separate concern
- **No clear separation** - Rendering vs state management vs event handling

**Proposed Refactoring:**

```
CanvasManager.ts (300 lines) - Main orchestrator
├── services/ (new folder)
│   ├── CanvasLifecycle.ts (120 lines)
│   │   - initialize, destroy, resize
│   │   - Event binding/unbinding
│   ├── ElementRenderer.ts (180 lines)
│   │   - createFabricObject (all element types)
│   │   - applyStyles, applyControls
│   ├── ElementOperations.ts (150 lines)
│   │   - addElement, updateElement, removeElement
│   │   - replaceAllElements
│   ├── SelectionManager.ts (100 lines)
│   │   - getSelection, setSelection
│   │   - Selection event handlers
│   ├── ZoomManager.ts (80 lines)
│   │   - setZoom, getZoom
│   │   - Pan and zoom utilities
│   └── PerformanceMonitor.ts (60 lines)
│       - FPS tracking
│       - Metrics collection
└── CanvasManager.ts (remaining)
    - Delegates to services
    - Maintains references
    - Public API facade
```

**Benefits:**
- **Single Responsibility** - Each service has one job
- **Testable** - Mock services in tests
- **Extensible** - Add new element types in ElementRenderer only
- **Maintainable** - Easy to find code (zoom logic in ZoomManager)
- **Decoupled** - Can swap Fabric.js more easily (services abstract it)

**Alternative (Service Locator Pattern):**
```typescript
class CanvasManager {
  private lifecycle: CanvasLifecycle;
  private renderer: ElementRenderer;
  private operations: ElementOperations;
  // etc.
  
  initialize() {
    this.lifecycle.initialize();
    this.operations.bindCanvas(this.lifecycle.canvas);
  }
}
```

**Effort Estimate:** 14 hours
- Hour 1-3: Design service boundaries, create interfaces
- Hour 4-6: Extract PerformanceMonitor + ZoomManager (independent)
- Hour 7-9: Extract ElementRenderer (complex, many element types)
- Hour 10-12: Extract ElementOperations + SelectionManager
- Hour 13-14: Extract CanvasLifecycle, integrate services

**Dependencies:** Should do AFTER editorStore refactor (less state coupling)

**Risk Level:** HIGH
- **Risk:** Breaking canvas rendering
- **Mitigation:** Extract one service at a time, extensive testing
- **Rollback:** Keep original CanvasManager until all services verified

**Success Criteria:**
- [ ] CanvasManager.ts < 400 lines
- [ ] 5-6 service classes created
- [ ] All canvas operations still work
- [ ] Performance maintained
- [ ] Code easier to navigate

**Priority:** 🔴 CRITICAL - Blocking canvas feature development

---

### 1.4 LeftSidebar.tsx - THE SIDEBAR (500+ LINES) 🟠 HIGH

**Location:** `src/components/layout/LeftSidebar.tsx`

**Status:** ✅ PARTIALLY CLEANED (responsive work done)

**Current State:**
- Estimated **500+ lines** (based on recent 467-line commit)
- Multiple responsibilities (tools, panels, templates, state management)

**Recent Improvements:**
- Responsive collapse behavior added
- Toggle button for mobile
- Auto-close on actions

**Remaining Issues:**
- All panel content likely still inline
- Template management logic mixed with UI
- Search/filter logic for templates

**Recommendation:**
- Extract panels to separate files (see PHASE1_GUIDE.md for detailed plan)
- Create `ToolBar.tsx`, `PanelManager.tsx`, individual panel components
- Move template management to custom hook (`useTemplateGallery`)

**Priority:** 🟠 HIGH (partially done, finish extraction)

---

### 1.5 BulkActions.tsx (254 LINES) 🟡 MEDIUM

**Location:** `src/components/ui/BulkActions.tsx`

**Current State:**
- **254 lines** - Above 200-line warning threshold
- Likely handles campaign bulk operations

**Recommendation:**
- Investigate responsibilities
- If it handles multiple bulk actions (export, delete, duplicate), split
- Consider `BulkExport.tsx`, `BulkDelete.tsx`, etc.

**Priority:** 🟡 MEDIUM - Not blocking, but worth reviewing

---

## 🟡 SMELL 2: MISSING ABSTRACTIONS

### 2.1 No Custom Hooks for Common Patterns

**Evidence:**
Based on codebase structure, likely patterns needing hooks:

**Missing Hook: useDebounced**
```typescript
// Likely pattern repeated in search inputs
const [searchTerm, setSearchTerm] = useState('');
const [debouncedTerm, setDebouncedTerm] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

**Proposed:**
```typescript
// hooks/useDebounced.ts
export function useDebounced<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}
```

**Benefits:**
- DRY (Don't Repeat Yourself)
- Consistent debounce delay across app
- Testable in isolation

**Effort:** 2 hours (create hook + refactor usages)

---

**Missing Hook: useLocalStorage**
```typescript
// Pattern for persisting UI state
const [sidebarOpen, setSidebarOpen] = useState(() => {
  const stored = localStorage.getItem('sidebar-open');
  return stored ? JSON.parse(stored) : true;
});

useEffect(() => {
  localStorage.setItem('sidebar-open', JSON.stringify(sidebarOpen));
}, [sidebarOpen]);
```

**Proposed:**
```typescript
// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue] as const;
}
```

**Effort:** 2 hours

---

### 2.2 No Compound Components

**Current State:**
Based on imports (Radix UI), you have some primitives but likely not custom compounds

**Needed:**
- `<Dropdown>` with `<Dropdown.Trigger>`, `<Dropdown.Content>`, `<Dropdown.Item>`
- `<Modal>` with `<Modal.Header>`, `<Modal.Body>`, `<Modal.Footer>`
- `<Tabs>` with `<Tabs.List>`, `<Tabs.Tab>`, `<Tabs.Panel>`

**Example (Dropdown):**
```typescript
// Instead of:
<Dropdown
  trigger={<button>Open</button>}
  items={[...]}
  onSelect={...}
/>

// Compound pattern:
<Dropdown>
  <Dropdown.Trigger>
    <button>Open</button>
  </Dropdown.Trigger>
  <Dropdown.Content>
    <Dropdown.Item>Option 1</Dropdown.Item>
    <Dropdown.Item>Option 2</Dropdown.Item>
  </Dropdown.Content>
</Dropdown>
```

**Benefits:**
- More flexible (can customize any part)
- Self-documenting (clear structure)
- Better TypeScript support

**Effort:** 20 hours (Phase 2, Task 2.4)

**Priority:** 🟡 MEDIUM - Part of Phase 2

---

### 2.3 No Error Handling Utilities

**Evidence:**
No `react-error-boundary` in dependencies

**Missing:**
- Error boundary components
- Error logging utilities
- Toast error helpers

**Recommendation:**
See Phase 4 (Error Handling) in refactoring plan

**Priority:** 🔴 CRITICAL - Add error boundaries ASAP

---

### 2.4 No Form Validation Utilities

**Evidence:**
No `zod` or validation library in dependencies

**Current State:**
Likely inline validation in components:
```typescript
// PropertiesPanel handles validation inline
if (isNaN(newX) || newX < 0) {
  // Show error
}
```

**Recommendation:**
Add Zod, create schemas (Phase 4)

**Priority:** 🟠 HIGH - Prevents bugs

---

## 🔴 SMELL 3: TESTING GAPS

### 3.1 Zero Tests Written

**Evidence:**
- Jest configured (`jest.config.js` exists from dependencies)
- `@types/jest` installed
- But no test files found (no grep results, would need to verify)

**Critical Missing Tests:**

**Unit Tests Needed:**
1. **editorStore.ts** - All actions (add, update, delete, undo/redo)
2. **CanvasManager.ts** - Element operations, lifecycle
3. **AlignmentGuides.ts** - Snap calculations
4. **SpatialHashGrid.ts** - Collision detection
5. **csvValidator.ts** - CSV validation rules

**Integration Tests Needed:**
1. Add element → appears in canvas + layers panel
2. Update element → syncs between canvas and properties panel
3. Undo/redo → state restoration
4. Multi-select → alignment operations

**E2E Tests Needed:**
1. Create template from scratch
2. Save and reload template
3. Export template to PNG
4. Import CSV and preview with data

**Effort Estimate:** 40 hours (entire Phase 3)

**Priority:** 🔴 CRITICAL - Required before major refactoring

---

## 🟢 SMELL 4: TYPESCRIPT - ACTUALLY GOOD!

### 4.1 Strict Mode: ENABLED ✅

**tsconfig.json Analysis:**
```json
{
  "compilerOptions": {
    "strict": true  // ✅ EXCELLENT!
  }
}
```

**This Means:**
- `noImplicitAny`: true - No inferred `any` types
- `strictNullChecks`: true - Proper null handling
- `strictFunctionTypes`: true - Function type checking
- `strictBindCallApply`: true - Bind/call/apply checked
- Plus all other strict flags

**Finding:** ✅ **NO ACTION NEEDED**

This is EXCELLENT news! You already have the strictest TypeScript configuration.

**Benefits:**
- Catching bugs at compile time
- Better IDE autocomplete
- Safer refactoring

**Note:** In REFACTORING_PLAN.md, we anticipated needing to enable strict mode
and budgeted 12 hours for it. **This time can be reallocated!**

---

## 🟡 SMELL 5: PERFORMANCE CONCERNS

### 5.1 Large Store Re-renders

**Issue:**
editorStore (1,178 lines) with many responsibilities means:
- Components subscribing to entire store re-render on ANY change
- Even if they only need one slice of state

**Example Problem:**
```typescript
// BAD: Re-renders on ANY store change
const state = useEditorStore();
const selectedElement = state.elements.find(e => e.id === state.selectedIds[0]);

// GOOD: Re-renders only when selectedIds or that element changes
const selectedElement = useEditorStore(state => 
  state.elements.find(e => e.id === state.selectedIds[0])
);
```

**Investigation Needed:**
- Audit all `useEditorStore()` calls
- Check if using selectors or subscribing to entire store

**Fix:**
- Use Zustand selectors everywhere
- Consider splitting store (see 1.1)

**Effort:** 4 hours (audit + fix)

**Priority:** 🟡 MEDIUM - Part of Phase 6 (Performance)

---

### 5.2 No Virtual Scrolling

**Issue:**
Layers panel likely renders ALL layers, even with 100+ elements

**Expected Code:**
```typescript
// LayersPanel.tsx - likely renders all
{layers.map(layer => <LayerItem key={layer.id} layer={layer} />)}
```

**Problem:**
- 500 layers × 50px = 25,000px tall DOM
- Browser struggles, slow scrolling
- High memory usage

**Solution:**
```typescript
// With react-window
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={layers.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <LayerItem style={style} layer={layers[index]} />
  )}
</FixedSizeList>
```

**Benefits:**
- Only renders ~20 visible items
- Smooth 60 FPS scrolling
- 95% less memory

**Effort:** 4 hours

**Priority:** 🟡 MEDIUM - Add in Phase 6 when performance is priority

---

### 5.3 No React.memo on Expensive Components

**Likely Issue:**
Large components (PropertiesPanel sections) re-render unnecessarily

**Example Problem:**
```typescript
// PositionSection re-renders even when different element selected
function PositionSection({ element }) {
  return <div>X: {element.x}, Y: {element.y}</div>;
}
```

**Fix:**
```typescript
const PositionSection = React.memo(({ element }) => {
  return <div>X: {element.x}, Y: {element.y}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if position changed
  return prevProps.element.x === nextProps.element.x &&
         prevProps.element.y === nextProps.element.y;
});
```

**Effort:** 2 hours (add memo to sections)

**Priority:** 🟡 MEDIUM - Do during PropertiesPanel refactor

---

## 📚 SMELL 6: DOCUMENTATION GAPS

### 6.1 No JSDoc on CanvasManager Methods

**Finding:**
CanvasManager has 36+ public methods with NO JSDoc

**Example:**
```typescript
// ❌ No documentation
addElement(element: Element) {
  // 38 lines of code
}

// ✅ Should be:
/**
 * Adds a new element to the canvas
 * 
 * Creates a Fabric.js object from the element data, applies custom controls,
 * registers in spatial grid for collision detection, and renders on canvas.
 * 
 * @param element - Element data (must have id, type, x, y, width, height)
 * @returns void
 * @throws Error if element type is invalid or canvas not initialized
 * 
 * @example
 * const textElement = {
 *   id: 'abc123',
 *   type: 'text',
 *   x: 100, y: 100,
 *   width: 200, height: 50,
 *   text: 'Hello World'
 * };
 * canvasManager.addElement(textElement);
 */
addElement(element: Element): void {
  // 38 lines of code
}
```

**Effort:** 8 hours (document all CanvasManager methods)

**Priority:** 🟡 MEDIUM - Part of Phase 5 (Documentation)

---

### 6.2 No Component Usage Examples

**Missing:**
- How to use PropertiesPanel
- How to use CanvasManager
- What props are required

**Recommendation:**
Add examples in JSDoc or create Storybook

**Priority:** 🟢 LOW - Phase 5

---

### 6.3 No Onboarding Guide

**Missing:**
`docs/CONTRIBUTING.md` with:
- How to set up development environment
- How to add new element type
- How to add new panel
- Code style guidelines

**Effort:** 4 hours

**Priority:** 🟡 MEDIUM - If expecting team growth

---

### 6.4 No Decision Records (ADRs)

**Missing:**
Documentation of WHY decisions were made

**Recommended ADRs:**
1. **001-use-fabricjs-over-konva.md**
   - Why migrate from Konva?
   - What problems did it solve?
   - Trade-offs accepted?

2. **002-three-layer-architecture.md**
   - Why React → Manager → Fabric.js?
   - Benefits of abstraction layer?

3. **003-zustand-over-redux.md**
   - Why Zustand?
   - Performance benefits?

**Effort:** 3 hours (write 3 ADRs)

**Priority:** 🟡 MEDIUM - Helpful for team context

---

## ⚠️ SMELL 7: DEPENDENCY OPTIMIZATION

### 7.1 Good News: No Problematic Imports Found ✅

**Searched For:**
- `import.*lodash` - NOT FOUND ✅
- `import.*papaparse` - NOT FOUND ✅
- `import.*jszip` - NOT FOUND ✅

**Conclusion:**
Either these libraries are:
1. Lazy-loaded (good!)
2. Not yet implemented
3. Removed (even better!)

**Action:** None needed for now

### 7.2 UUID + nanoid Duplication

**From package.json:**
- `uuid` (13.0.0) - 3KB
- `nanoid` (5.1.6) - 1KB

**Usage Policy Needed:**
Document when to use which:
- **nanoid** for client-side IDs (elements, temp data)
- **uuid** for database records (templates, users)

**Effort:** 30 minutes (document in ARCHITECTURE.md)

**Priority:** 🟢 LOW - cosmetic

---

## 🎯 PRIORITY MATRIX

### Priority 1: CRITICAL (Weeks 1-2)

| Issue | Lines | Effort | Risk | Impact |
|-------|-------|--------|------|--------|
| editorStore split | 1,178 | 16h | HIGH | Huge - enables scaling |
| PropertiesPanel split | 895 | 12h | MED | High - enables UI work |
| CanvasManager split | 824 | 14h | HIGH | High - enables canvas work |
| Add Error Boundaries | - | 4h | LOW | Critical - app stability |
| Write critical tests | - | 20h | LOW | Critical - safe refactoring |

**Total:** ~66 hours

### Priority 2: HIGH (Weeks 2-3)

| Issue | Effort | Impact |
|-------|--------|--------|
| Create custom hooks (useDebounced, useLocalStorage) | 4h | Med - code reuse |
| Performance audit (selectors, memo) | 6h | Med - UX improvement |
| LeftSidebar extraction (finish) | 6h | Med - clean code |

**Total:** ~16 hours

### Priority 3: MEDIUM (Weeks 4-6)

| Issue | Effort | Impact |
|-------|--------|--------|
| Virtual scrolling (LayersPanel) | 4h | Med - performance |
| Compound components | 20h | Med - UI consistency |
| JSDoc all public APIs | 12h | Low - developer experience |
| Form validation (Zod) | 6h | Med - bug prevention |

**Total:** ~42 hours

### Priority 4: LOW (Weeks 7-8)

| Issue | Effort | Impact |
|-------|--------|--------|
| UUID/nanoid policy | 0.5h | Low - clarity |
| ADRs (decision records) | 3h | Low - team context |
| CONTRIBUTING.md | 4h | Low - onboarding |

**Total:** ~7.5 hours

---

## ✅ SUCCESS METRICS

### Phase 1 Complete When:
- [ ] No files >500 lines (except generated)
- [ ] All "god" components split
- [ ] Error boundaries in place
- [ ] 50+ critical tests written
- [ ] All public APIs documented

### Code Quality Targets:
- **Max file size:** 300 lines (soft limit), 500 lines (hard limit)
- **Test coverage:** >80% (statements, branches, functions)
- **TypeScript:** Strict mode ✅ (already enabled!)
- **Performance:** 60 FPS with 500+ elements
- **Bundle size:** <500KB gzipped

---

## 📊 TECHNICAL DEBT SCORE

### Current State

| Category | Score | Target |
|----------|-------|--------|
| Code Organization | 4/10 | 9/10 |
| Testing | 1/10 | 8/10 |
| Documentation | 5/10 | 8/10 |
| Performance | 6/10 | 9/10 |
| Type Safety | 9/10 ✅ | 9/10 |
| Error Handling | 2/10 | 8/10 |

**Overall Debt Score:** 4.5/10 (Moderate-High)

**Target After Refactoring:** 8.5/10

---

## 🚀 NEXT ACTIONS

### Immediate (This Week):
1. ✅ Review this document
2. Add Error Boundaries (4h) - Quick win, high impact
3. Start editorStore split (16h)
4. Write first tests for editorStore (4h)

### Week 2:
5. Complete editorStore split
6. Start PropertiesPanel split (12h)
7. Write tests for split stores (8h)

### Week 3-4:
8. Complete PropertiesPanel split
9. Start CanvasManager split (14h)
10. Integration tests (16h)

**Total Week 1-4 Estimate:** ~80 hours

---

**Document Created:** 2025-12-15  
**Last Updated:** 2025-12-15  
**Next Review:** After completing Priority 1 refactors
