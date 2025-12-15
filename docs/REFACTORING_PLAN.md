# Refactoring Plan

> **Created:** 2025-12-15  
> **Status:** Phase 1 Complete - Ready for Execution  
> **Total Issues:** 23  
> **Estimated Effort:** ~131 hours (4-6 weeks)

---

## 📊 Executive Summary

### Issues by Priority

| Priority | Issues | Effort | Timeline |
|----------|--------|--------|----------|
| 🔴 **CRITICAL** | 5 | 62h | Week 1-2 |
| 🟠 **HIGH** | 6 | 22h | Week 2-3 |
| 🟡 **MEDIUM** | 8 | 42h | Week 4-6 |
| 🟢 **LOW** | 4 | 5h | Week 6-8 |

### Quick Wins (Can do now)

1. **Remove unused dependencies** (15 min) - Save 150KB
2. **Add error boundaries** (4h) - Prevent white screen crashes
3. **Document UUID/nanoid policy** (30 min) - Prevent confusion

---

## 🔴 PRIORITY 1: CRITICAL (BLOCKING DEVELOPMENT)

**Goal:** Unblock feature development, prevent catastrophic failures

**Timeline:** Week 1-2 (62 hours)

---

### ISSUE 1.1: editorStore God Store (1,178 LINES)

**Current State:**
- Single file with 1,178 lines
- 62 functions, 16 distinct responsibilities
- Hard to test, navigate, extend
- Performance risk (unnecessary re-renders)

**Desired State:**
```
editorStore.ts → 7 specialized stores:
├── templateStore.ts (150 lines)
├── canvasStore.ts (100 lines)
├── elementsStore.ts (200 lines)
├── selectionStore.ts (100 lines)
├── historyStore.ts (150 lines)
├── layersStore.ts (250 lines)
└── alignmentStore.ts (200 lines)
```

**Execution Plan:**

**Phase 1.1.1: Extract Template & Canvas (Week 1, Day 1-2)**
```typescript
// templateStore.ts
export const useTemplateStore = create<{
  templateId: string;
  templateName: string;
  isNewTemplate: boolean;
  templates: TemplateListItem[];
  // Actions
  loadTemplate: (template) => void;
  resetToNewTemplate: () => void;
  setTemplateName: (name) => void;
}>(...);

// canvasStore.ts
export const useCanvasStore = create<{
  canvasSize: CanvasSize;
  backgroundColor: string;
  zoom: number;
  // Actions
  setCanvasSize: (width, height) => void;
  setBackgroundColor: (color) => void;
  setZoom: (zoom) => void;
}>(...);
```

**Effort:** 4 hours
- 1h: Design store interfaces
- 2h: Extract code, update imports
- 1h: Test

**Phase 1.1.2: Extract Elements & Selection (Week 1, Day 2-3)**
```typescript
// elementsStore.ts
export const useElementsStore = create<{
  elements: Element[];
  // CRUD only
  addElement: (element) => void;
  updateElement: (id, updates) => void;
  deleteElement: (id) => void;
  duplicateElement: (id) => void;
}>(...);

// selectionStore.ts
export const useSelectionStore = create<{
  selectedIds: string[];
  // Selection management
  selectElement: (id) => void;
  toggleSelection: (id) => void;
  deselectAll: () => void;
}>(...);
```

**Effort:** 5 hours
- 2h: Extract elementsStore
- 2h: Extract selectionStore
- 1h: Update components to use multiple stores

**Phase 1.1.3: Extract History (Week 1, Day 4)**
```typescript
// historyStore.ts
type HistorySnapshot = {
  elements: Element[];
  canvasSize: CanvasSize;
  backgroundColor: string;
};

export const useHistoryStore = create<{
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  // History actions
  pushHistory: (snapshot) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}>(...);
```

**Effort:** 3 hours
- 2h: Extract store, handle snapshot creation
- 1h: Wire up to elements/canvas stores

**Phase 1.1.4: Extract Layers & Alignment (Week 1, Day 5)**
```typescript
// layersStore.ts
export const useLayersStore = create<{
  // All layer ordering
  moveElementForward: (id) => void;
  moveElementBackward: (id) => void;
  moveElementToFront: (id) => void;
  moveElementToBack: (id) => void;
  reorderElements: (fromIndex, toIndex) => void;
}>(...);

// alignmentStore.ts
export const useAlignmentStore = create<{
  // All alignment/distribution
  alignElement: (id, alignment) => void;
  alignSelectedElements: (alignment) => void;
  distributeSelectedElements: (direction) => void;
}>(...);
```

**Effort:** 4 hours
- 2h: Extract layers
- 2h: Extract alignment

**Total Effort:** 16 hours

**Dependencies:** None (can start immediately)

**Risk Level:** HIGH
- **Risk:** Breaking undo/redo (relies on entire state snapshot)
- **Mitigation:** 
  - Extract one store at a time
  - Test undo/redo after each extraction
  - Use git branches for each phase
- **Rollback:** Git revert to previous working state

**Testing Strategy:**
```typescript
// Test undo/redo after each extraction
describe('History integration', () => {
  it('should undo element addition', () => {
    // Add element
    elementsStore.getState().addElement(testElement);
    // Undo
    historyStore.getState().undo();
    // Verify element removed
    expect(elementsStore.getState().elements).toHaveLength(0);
  });
});
```

**Success Criteria:**
- [ ] 7 separate store files created
- [ ] Each file < 300 lines
- [ ] All existing functionality preserved
- [ ] Undo/redo works across stores
- [ ] Performance maintained or improved
- [ ] No circular dependencies
- [ ] Components update imports correctly
- [ ] TypeScript compiles without errors

**Priority:** 🔴 CRITICAL

---

### ISSUE 1.2: PropertiesPanel God Component (895 LINES)

**Current State:**
- 895 lines in single file
- 8+ UI sections mixed together
- Hard to test, maintain, reuse

**Desired State:**
```
src/components/panels/
├── PropertiesPanel.tsx (100 lines) - Container only
└── sections/
    ├── LayerOrderSection.tsx (80 lines)
    ├── AlignmentSection.tsx (120 lines)
    ├── PositionSection.tsx (60 lines)
    ├── SizeSection.tsx (80 lines)
    ├── AppearanceSection.tsx (50 lines)
    ├── TextPropertiesSection.tsx (150 lines)
    ├── ImagePropertiesSection.tsx (100 lines)
    └── effects/
        ├── EffectsSection.tsx (60 lines)
        ├── ShadowControls.tsx (80 lines)
        ├── OutlineControls.tsx (60 lines)
        └── BackgroundControls.tsx (50 lines)
```

**Execution Plan:**

**Phase 1.2.1: Create Folder Structure & Extract Helpers (Day 1)**
```bash
mkdir -p src/components/panels/sections
mkdir -p src/components/panels/sections/effects
mkdir -p src/components/panels/inputs
```

Extract helper components:
- `PropertyInput.tsx`
- `SliderRow.tsx`
- `StyleButton.tsx`

**Effort:** 2 hours

**Phase 1.2.2: Extract Simple Sections (Day 2-3)**

Order: Simplest first (fewer dependencies)

1. **PositionSection.tsx** (60 lines)
```typescript
export const PositionSection = ({ element }: { element: Element }) => {
  const updateElement = useElementsStore(state => state.updateElement);
  const pushHistory = useHistoryStore(state => state.pushHistory);
  
  const handleChange = (updates: Partial<Element>) => {
    pushHistory();
    updateElement(element.id, updates);
  };
  
  return (
    <div className="space-y-2">
      <PropertyInput label="X" value={element.x} onChange={x => handleChange({ x })} />
      <PropertyInput label="Y" value={element.y} onChange={y => handleChange({ y })} />
    </div>
  );
};
```

2. **SizeSection.tsx** (80 lines)
3. **AppearanceSection.tsx** (50 lines)

**Effort:** 3 hours

**Phase 1.2.3: Extract Complex Sections (Day 4-5)**

4. **AlignmentSection.tsx** (120 lines) - Uses alignment store
5. **LayerOrderSection.tsx** (80 lines) - Uses layers store
6. **TextPropertiesSection.tsx** (150 lines)
7. **ImagePropertiesSection.tsx** (100 lines)

**Effort:** 5 hours

**Phase 1.2.4: Split EffectsSection (Day 6)**

8. Extract effects sub-components
9. Update PropertiesPanel to import sections

**Effort:** 2 hours

**Total Effort:** 12 hours

**Dependencies:** Should do AFTER editorStore split (cleaner store access)

**Risk Level:** MEDIUM
- **Risk:** Breaking property updates
- **Mitigation:** Extract one section at a time, test after each
- **Rollback:** Git commits per section

**Performance Optimization:**
```typescript
// Add React.memo to prevent unnecessary re-renders
export const PositionSection = React.memo(({ element }) => {
  // ... component code
}, (prevProps, nextProps) => {
  // Only re-render if position changed
  return prevProps.element.x === nextProps.element.x &&
         prevProps.element.y === nextProps.element.y;
});
```

**Success Criteria:**
- [ ] PropertiesPanel.tsx < 150 lines
- [ ] Each section in separate file
- [ ] All sections independently testable
- [ ] Property updates still work
- [ ] Performance improved (React.memo on sections)
- [ ] No visual changes (pixel-perfect)

**Priority:** 🔴 CRITICAL

---

### ISSUE 1.3: CanvasManager God Class (824 LINES)

**Current State:**
- 824 lines in single file
- 36+ methods, 10+ responsibilities
- Tightly coupled to Fabric.js

**Desired State:**
```
src/lib/canvas/
├── CanvasManager.ts (300 lines) - Orchestrator
└── services/
    ├── CanvasLifecycle.ts (120 lines)
    ├── ElementRenderer.ts (180 lines)
    ├── ElementOperations.ts (150 lines)
    ├── SelectionManager.ts (100 lines)
    ├── ZoomManager.ts (80 lines)
    └── PerformanceMonitor.ts (60 lines)
```

**Execution Plan:**

**Phase 1.3.1: Extract Independent Services (Day 1-2)**

Start with services with NO dependencies on others:

```typescript
// PerformanceMonitor.ts (60 lines)
export class PerformanceMonitor {
  private fps = 60;
  private frames = 0;
  private lastTime = performance.now();
  
  update() {
    const now = performance.now();
    this.frames++;
    if (now >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
      this.frames = 0;
      this.lastTime = now;
    }
  }
  
  getFPS() { return this.fps; }
}

// ZoomManager.ts (80 lines)
export class ZoomManager {
  private canvas: fabric.Canvas | null = null;
  private currentZoom = 1;
  
  setCanvas(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }
  
  setZoom(zoom: number) {
    if (!this.canvas) return;
    this.currentZoom = zoom;
    this.canvas.setZoom(zoom);
    this.canvas.renderAll();
  }
  
  getZoom() { return this.currentZoom; }
}
```

**Effort:** 3 hours

**Phase 1.3.2: Extract ElementRenderer (Day 3-4)**

Most complex service (handles all element types):

```typescript
// ElementRenderer.ts
export class ElementRenderer {
  createFabricObject(element: Element): fabric.FabricObject | null {
    switch (element.type) {
      case 'text':
        return this.createTextObject(element as TextElement);
      case 'image':
        return this.createImageObject(element as ImageElement);
      case 'shape':
        return this.createShapeObject(element as ShapeElement);
      default:
        return null;
    }
  }
  
  private createTextObject(element: TextElement): fabric.Textbox {
    // 50 lines of text creation logic
  }
  
  private createImageObject(element: ImageElement): fabric.Image {
    // 40 lines of image creation logic
  }
  
  private createShapeObject(element: ShapeElement): fabric.Object {
    // 30 lines of shape creation logic
  }
}
```

**Effort:** 5 hours

**Phase 1.3.3: Extract Operations & Selection (Day 5-6)**

```typescript
// ElementOperations.ts
export class ElementOperations {
  constructor(
    private canvas: fabric.Canvas,
    private renderer: ElementRenderer
  ) {}
  
  addElement(element: Element) {
    const fabricObject = this.renderer.createFabricObject(element);
    if (fabricObject) {
      this.canvas.add(fabricObject);
      this.canvas.renderAll();
    }
  }
  
  // updateElement, removeElement, etc.
}

// SelectionManager.ts
export class SelectionManager {
  getSelection(): string[] {
    const activeObjects = this.canvas.getActiveObjects();
    return activeObjects.map(obj => obj.data?.id).filter(Boolean);
  }
  
  // setSelection, clearSelection, etc.
}
```

**Effort:** 4 hours

**Phase 1.3.4: Integrate Services into CanvasManager (Day 7)**

```typescript
// CanvasManager.ts (now 300 lines)
export class CanvasManager {
  private lifecycle: CanvasLifecycle;
  private renderer: ElementRenderer;
  private operations: ElementOperations;
  private selection: SelectionManager;
  private zoom: ZoomManager;
  private performance: PerformanceMonitor;
  
  constructor() {
    this.renderer = new ElementRenderer();
    this.zoom = new ZoomManager();
    this.performance = new PerformanceMonitor();
    // Services initialized in initialize()
  }
  
  initialize(canvasElement: HTMLCanvasElement, config: CanvasConfig) {
    this.lifecycle = new CanvasLifecycle(canvasElement, config);
    const canvas = this.lifecycle.getCanvas();
    
    this.operations = new ElementOperations(canvas, this.renderer);
    this.selection = new SelectionManager(canvas);
    this.zoom.setCanvas(canvas);
  }
  
  // Public API delegates to services
  addElement(element: Element) {
    this.operations.addElement(element);
  }
  
  setZoom(zoom: number) {
    this.zoom.setZoom(zoom);
  }
}
```

**Effort:** 2 hours

**Total Effort:** 14 hours

**Dependencies:** Should do AFTER editorStore split (less coupling)

**Risk Level:** HIGH
- **Risk:** Breaking canvas rendering
- **Mitigation:** 
  - Extract one service at a time
  - Extensive visual testing after each
  - Keep integration tests running
- **Rollback:** Git branch per service

**Testing Strategy:**
```typescript
describe('ElementRenderer', () => {
  it('should create text object with correct props', () => {
    const renderer = new ElementRenderer();
    const textElement: TextElement = { /* ... */ };
    const fabricObject = renderer.createFabricObject(textElement);
    
    expect(fabricObject).toBeInstanceOf(fabric.Textbox);
    expect(fabricObject.text).toBe(textElement.text);
  });
});
```

**Success Criteria:**
- [ ] CanvasManager.ts < 400 lines
- [ ] 6 service classes created
- [ ] All canvas operations still work
- [ ] Performance maintained
- [ ] Easier to add new element types
- [ ] Services are testable in isolation

**Priority:** 🔴 CRITICAL

---

### ISSUE 1.4: No Error Boundaries

**Current State:**
- Zero error boundaries
- Any React error crashes entire app
- White screen of death for users

**Desired State:**
```
App
└── TopLevelErrorBoundary (catches catastrophic errors)
    └── EditorPage
        ├── CanvasErrorBoundary (isolates canvas crashes)
        │   └── EditorCanvas
        ├── LeftSidebarErrorBoundary
        │   └── LeftSidebar
        └── RightPanelErrorBoundary
            └── RightPanel
```

**Execution Plan:**

**Phase 1.4.1: Install Dependency (15 min)**
```bash
npm install react-error-boundary@^4.0.0
```

**Phase 1.4.2: Create Error Fallback UIs (1h)**

```typescript
// src/components/errors/ErrorFallback.tsx
export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
};

// CanvasErrorFallback.tsx - Specific to canvas
export const CanvasErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <p>Canvas failed to render</p>
      <p className="text-sm text-gray-500">{error.message}</p>
      <button onClick={resetErrorBoundary}>Reload Canvas</button>
    </div>
  );
};
```

**Phase 1.4.3: Wrap Critical Sections (2h)**

```typescript
// src/app/editor/page.tsx
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback, CanvasErrorFallback } from '@/components/errors';

export default function EditorPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="flex h-screen">
        <LeftSidebar />
        
        <ErrorBoundary FallbackComponent={CanvasErrorFallback}>
          <CanvasArea />
        </ErrorBoundary>
        
        <RightPanel />
      </div>
    </ErrorBoundary>
  );
}
```

**Phase 1.4.4: Add Error Logging (1h)**

```typescript
// src/lib/errorLogger.ts
export const logError = (error: Error, errorInfo: ErrorInfo) => {
  console.error('Error caught by boundary:', error, errorInfo);
  
  // Send to error tracking service (Sentry, LogRocket, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error);
  // }
};

// Update error boundaries
<ErrorBoundary 
  FallbackComponent={ErrorFallback}
  onError={logError}
>
```

**Total Effort:** 4 hours

**Dependencies:** None

**Risk Level:** LOW (only adding, not changing existing code)

**Success Criteria:**
- [ ] App wrapped in top-level ErrorBoundary
- [ ] EditorCanvas wrapped in canvas-specific boundary
- [ ] Each panel wrapped in panel boundary
- [ ] Errors show user-friendly message
- [ ] Errors logged to console (and Sentry if set up)
- [ ] Test error scenarios (throw error in component)

**Priority:** 🔴 CRITICAL - User experience protection

---

### ISSUE 1.5: No Tests

**Current State:**
- Jest configured but 0 tests written
- Can't refactor safely
- Regression bugs likely

**Desired State:**
- **Critical coverage:** editorStore, CanvasManager, alignment
- **Target:** 50% coverage minimum (80% goal for Phase 3)

**Execution Plan:**

**Phase 1.5.1: Test Infrastructure (Week 2, Day 1)**

```typescript
// src/setupTests.ts
import '@testing-library/jest-dom';

// Mock Fabric.js
jest.mock('fabric', () => ({
  Canvas: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    renderAll: jest.fn(),
  })),
  Textbox: jest.fn(),
  // Mock other Fabric classes
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
    })),
  })),
}));
```

**Effort:** 2 hours

**Phase 1.5.2: Test Stores (Week 2, Day 2-3)**

After store split, test each store:

```typescript
// src/stores/__tests__/elementsStore.test.ts
describe('elementsStore', () => {
  beforeEach(() => {
    useElementsStore.setState({ elements: [] });
  });
  
  describe('addElement', () => {
    it('should add element to store', () => {
      const element = { id: '1', type: 'text', /* ... */ };
      useElementsStore.getState().addElement(element);
      
      const elements = useElementsStore.getState().elements;
      expect(elements).toHaveLength(1);
      expect(elements[0]).toEqual(element);
    });
  });
  
  describe('updateElement', () => {
    it('should update element properties', () => {
      const element = { id: '1', type: 'text', x: 0, y: 0 };
      useElementsStore.setState({ elements: [element] });
      
      useElementsStore.getState().updateElement('1', { x: 100 });
      
      const updated = useElementsStore.getState().elements[0];
      expect(updated.x).toBe(100);
      expect(updated.y).toBe(0); // Unchanged
    });
  });
  
  describe('deleteElement', () => {
    it('should remove element from store', () => {
      const elements = [
        { id: '1', type: 'text' },
        { id: '2', type: 'text' },
      ];
      useElementsStore.setState({ elements });
      
      useElementsStore.getState().deleteElement('1');
      
      expect(useElementsStore.getState().elements).toHaveLength(1);
      expect(useElementsStore.getState().elements[0].id).toBe('2');
    });
  });
});
```

**Effort:** 8 hours (7 stores × ~1h each)

**Phase 1.5.3: Test Utilities (Week 2, Day 4)**

```typescript
// src/lib/utils/__tests__/csvValidator.test.ts
describe('csvValidator', () => {
  it('should validate correct CSV structure', () => {
    const csv = 'name,price\nProduct 1,10\nProduct 2,20';
    const result = validateCSV(csv);
    expect(result.isValid).toBe(true);
  });
  
  it('should detect missing headers', () => {
    const csv = 'Product 1,10\nProduct 2,20';
    const result = validateCSV(csv);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Missing headers');
  });
});

// src/lib/utils/__tests__/fieldNameParser.test.ts
describe('fieldNameParser', () => {
  it('should extract field names from template string', () => {
    const text = 'Hello {{name}}, your price is {{price}}';
    const fields = parseFieldNames(text);
    expect(fields).toEqual(['name', 'price']);
  });
});
```

**Effort:** 4 hours

**Phase 1.5.4: Integration Tests (Week 2, Day 5)**

```typescript
// src/__tests__/integration/elementLifecycle.test.ts
describe('Element Lifecycle', () => {
  it('should add element to store and canvas', () => {
    // Arrange
    const canvasManager = new CanvasManager();
    const canvasElement = document.createElement('canvas');
    canvasManager.initialize(canvasElement, { width: 800, height: 600 });
    
    // Act
    const element = { id: '1', type: 'text', x: 100, y: 100 };
    useElementsStore.getState().addElement(element);
    canvasManager.addElement(element);
    
    // Assert
    const storeElements = useElementsStore.getState().elements;
    expect(storeElements).toHaveLength(1);
    
    const canvasObjects = canvasManager.getCanvas().getObjects();
    expect(canvasObjects).toHaveLength(1);
  });
});
```

**Effort:** 6 hours

**Total Effort:** 20 hours

**Dependencies:** Do AFTER store split (easier to test)

**Success Criteria:**
- [ ] 50+ tests written
- [ ] Coverage >50% (statements, branches)
- [ ] All critical paths tested
- [ ] Tests run in CI (future)
- [ ] Can refactor with confidence

**Priority:** 🔴 CRITICAL - Enables safe refactoring

---

## 🟠 PRIORITY 2: HIGH (CAUSING DAILY PAIN)

**Goal:** Improve developer experience, reduce friction

**Timeline:** Week 2-3 (22 hours)

---

### ISSUE 2.1: Remove Unused Dependencies

**Impact:** Save ~150KB bundle size (33% reduction!)

**Execution:**

```bash
# Confirmed UNUSED (15 minutes)
npm uninstall date-fns nanoid uuid use-image

# If papaparse/jszip not used or lazy-loaded
npm uninstall papaparse jszip
npm uninstall --save-dev @types/papaparse
```

**Verification:**
```bash
npm run build
# Check bundle size before/after
```

**Effort:** 15 minutes

**Priority:** 🟠 HIGH - Quick win

---

### ISSUE 2.2: LeftSidebar Extraction (Finish)

**Status:** Partially done (responsive work complete)

**Remaining:** Extract panels to separate files

**See:** PHASE1_GUIDE.md for detailed extraction plan

**Effort:** 6 hours

**Priority:** 🟠 HIGH

---

### ISSUE 2.3: Create Custom Hooks

**useDebounced:**
```typescript
// src/hooks/useDebounced.ts
export function useDebounced<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}
```

**useLocalStorage:**
```typescript
// src/hooks/useLocalStorage.ts
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

**useSelectedElement:**
```typescript
// src/hooks/useSelectedElement.ts
export function useSelectedElement(): Element | null {
  return useEditorStore(state => {
    const selectedId = state.selectedIds[0];
    if (!selectedId) return null;
    return state.elements.find(e => e.id === selectedId) || null;
  });
}
```

**Effort:** 4 hours (create + refactor usages)

**Priority:** 🟠 HIGH - DRY and performance

---

### ISSUE 2.4: Fix Prop Drilling

**Pattern:**
```typescript
// BEFORE: Props drilled 3 levels
<EditorLayout zoom={zoom}>
  <CanvasArea zoom={zoom}>
    <AlignmentGuides zoom={zoom} />

// AFTER: Direct subscription
const AlignmentGuides = () => {
  const zoom = useCanvasStore(state => state.zoom);
  // Use zoom directly
};
```

**Effort:** 3 hours (find all cases + refactor)

**Priority:** 🟠 HIGH - Code clarity

---

### ISSUE 2.5: Document State Management Rules

**Create:** `docs/STATE_MANAGEMENT.md`

```markdown
# State Management Guidelines

## When to use useState

- Truly local UI state (hover, focus, dropdown open)
- Not needed by any other component
- Temporary state (form inputs before submit)

## When to use Zustand

- Shared state accessed by multiple components
- Persisted state (survives component unmount)
- Global app state (selection, elements, canvas config)

## When to use useRef

- Imperative handles (DOM refs, CanvasManager, timers)
- Values that change but don't trigger re-renders
- Mutable values in callbacks

## Current Stores

- `useTemplateStore` - Template metadata
- `useCanvasStore` - Canvas configuration
- `useElementsStore` - Element CRUD
- `useSelectionStore` - Element selection
- `useHistoryStore` - Undo/redo
- `useLayersStore` - Layer ordering
- `useAlignmentStore` - Alignment operations
```

**Effort:** 2 hours

**Priority:** 🟠 HIGH - Team clarity

---

### ISSUE 2.6: Reorganize Components Folder

**Current (messy):**
```
src/components/
├── campaign/
├── dashboard/
├── editor/
├── gallery/
```

**Proposed (clear):**
```
src/components/
├── canvas/       # Canvas-specific
├── panels/       # All panels
│   ├── sections/ # Panel sections
│   └── inputs/   # Panel inputs
├── layout/       # Layout containers
├── primitives/   # UI building blocks
├── features/     # Feature-specific
└── errors/       # Error boundaries
```

**Effort:** 6 hours

**Priority:** 🟠 HIGH - Developer experience

---

## 🟡 PRIORITY 3: MEDIUM (TECHNICAL DEBT)

**Timeline:** Week 4-6 (42 hours)

### ISSUE 3.1: Virtual Scrolling for LayersPanel

**Add react-window:**
```bash
npm install react-window@^1.8.10
npm install --save-dev @types/react-window
```

```typescript
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

**Effort:** 4 hours

---

### ISSUE 3.2: Add React.memo

**Pattern:**
```typescript
const PositionSection = React.memo(({ element }) => {
  // Component code
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.element.x === nextProps.element.x &&
         prevProps.element.y === nextProps.element.y;
});
```

**Apply to:** All PropertiesPanel sections

**Effort:** 2 hours

---

### ISSUE 3.3: Compound Components

**Create 10 primitives:**
- Dropdown
- Modal
- Tabs
- Accordion (enhance existing)
- Slider
- ColorPicker (wrap react-colorful)
- Button (enhance existing)
- Input (enhance existing)
- Tooltip (enhance existing)
- Dialog

**Effort:** 20 hours (2h per component)

---

### ISSUE 3.4: Add Form Validation (Zod)

```bash
npm install zod@^3.22.0
```

```typescript
// src/lib/validations/element.ts
import { z } from 'zod';

export const ElementSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'image', 'shape', 'frame']),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});

// Usage
const result = ElementSchema.safeParse(data);
if (!result.success) {
  console.error(result.error.errors);
}
```

**Effort:** 6 hours

---

### ISSUE 3.5: JSDoc All Public APIs

**Target:** CanvasManager (36 methods)

**Effort:** 8 hours

---

### ISSUE 3.6: Bundle Size Monitoring

```bash
npm install --save-dev @next/bundle-analyzer
```

```typescript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

module.exports = withBundleAnalyzer({
  // existing config
});
```

**Run:**
```bash
ANALYZE=true npm run build
```

**Effort:** 2 hours

---

## 🟢 PRIORITY 4: LOW (POLISH)

**Timeline:** Week 6-8 (5 hours)

### ISSUE 4.1: UUID/nanoid Policy

**Document in ARCHITECTURE.md:**
- nanoid for client-side IDs
- uuid for database records (if needed)
- Or remove both if not used

**Effort:** 30 minutes

---

### ISSUE 4.2: Create ADRs

**Architecture Decision Records:**

1. **001-use-fabricjs-over-konva.md**
2. **002-three-layer-architecture.md**
3. **003-zustand-over-redux.md**

**Effort:** 3 hours

---

### ISSUE 4.3: CONTRIBUTING.md

**Onboarding guide with:**
- Setup instructions
- How to add features
- Code style guidelines
- PR process

**Effort:** 4 hours (or wait for team growth)

---

## 📅 WEEK-BY-WEEK BREAKDOWN

### Week 1 (40 hours)

**Mon-Tue:** editorStore split (16h)
- Extract templateStore, canvasStore
- Extract elementsStore, selectionStore
- Extract historyStore, layersStore, alignmentStore
- Test undo/redo integration

**Wed:** Error boundaries (4h)
- Install react-error-boundary
- Create fallback UIs
- Wrap critical sections

**Thu:** Remove unused deps + custom hooks (4h)
- npm uninstall unused packages
- Create useDebounced, useLocalStorage, useSelectedElement

**Fri:** Start tests (16h of 20h)
- Test infrastructure setup
- Test all new stores

---

### Week 2 (42 hours)

**Mon:** Finish tests (4h remaining)
- Integration tests

**Tue-Wed:** PropertiesPanel split (12h)
- Extract helpers
- Extract simple sections
- Extract complex sections
- Split EffectsSection

**Thu-Fri:** CanvasManager split (14h)
- Extract PerformanceMonitor, ZoomManager
- Extract ElementRenderer
- Extract Operations, Selection
- Integrate services

**Weekend:** LeftSidebar extraction (6h)

---

### Week 3 (16 hours)

**Mon:** Fix prop drilling (3h)

**Tue:** Reorganize components (6h)

**Wed:** Document state management (2h)

**Thu-Fri:** Start Phase 3 work or take break

---

### Weeks 4-8: Medium & Low Priority (47 hours)

Spread across 5 weeks as time permits

---

## ✅ SUCCESS METRICS

### Phase 1 Complete When:

**Code Quality:**
- [ ] No files >500 lines
- [ ] 7 Zustand stores (each <300 lines)
- [ ] PropertiesPanel split into 10+ files
- [ ] CanvasManager split into 6 services
- [ ] 50+ tests written (>50% coverage)
- [ ] Error boundaries in place

**Bundle Size:**
- [ ] <300KB (from ~455KB)
- [ ] Unused deps removed

**Documentation:**
- [x] ARCHITECTURE.md ✅
- [x] TECHNICAL_DEBT.md ✅
- [x] DEPENDENCIES.md ✅
- [x] REFACTORING_PLAN.md ✅
- [ ] STATE_MANAGEMENT.md (Week 2)

**Developer Experience:**
- [ ] Clear component organization
- [ ] Custom hooks for common patterns
- [ ] No prop drilling >2 levels
- [ ] State management rules documented

---

## 🎯 FINAL NOTES

### Remember:

1. **One thing at a time** - Don't try to refactor everything at once
2. **Test after each change** - Keep app working throughout
3. **Git commits per task** - Easy rollback if needed
4. **Update PROGRESS.md daily** - Track what's done
5. **Celebrate milestones** - 16h is a LOT of work!

### If Stuck:

1. Check TECHNICAL_DEBT.md for detailed analysis
2. Check PHASE1_GUIDE.md for step-by-step instructions
3. Roll back to last working commit
4. Take a break, come back fresh

### After Phase 1:

Move to **Phase 2: Component Architecture Redesign**
- Build out primitive library
- Implement compound components
- Create consistent design system

---

**Document Created:** 2025-12-15  
**Ready for Execution:** ✅ YES  
**Estimated Completion:** 4-6 weeks  
**Let's build something amazing! 🚀**
