# 📋 PHASE 1: CODEBASE ARCHAEOLOGY - COMPLETE EXECUTION GUIDE

> **Purpose:** Step-by-step guide for Week 1 of the 8-week refactoring plan  
> **Timeline:** Week 1 (40 hours)  
> **Deliverables:** 4 critical documentation files

---

## 🎯 WEEK 1 DELIVERABLES

By the end of Week 1, you will have created **FOUR critical documentation files** that map every aspect of your codebase:

1. ✅ **docs/ARCHITECTURE.md** - Complete system architecture (COMPLETED)
2. **docs/TECHNICAL_DEBT.md** - All architectural smells identified
3. **docs/DEPENDENCIES.md** - Every dependency analyzed
4. **docs/REFACTORING_PLAN.md** - Prioritized improvement roadmap

---

## 📝 TASK 1.1: CREATE ARCHITECTURE.MD ✅ COMPLETED

See existing `docs/ARCHITECTURE.md` for completed comprehensive documentation covering:
- Project overview
- Technology stack decisions
- Directory structure mapping
- Data flow architecture
- State management
- Component hierarchy
- Third-party integrations
- Design decisions

---

## 🔍 TASK 1.2: IDENTIFY ARCHITECTURAL SMELLS

**CREATE FILE:** `docs/TECHNICAL_DEBT.md`

Based on the commit history and structure, here's what to investigate:

### SMELL 1: GOD COMPONENTS

**Investigation Process:**

1. **Count lines in each component file:**
   ```bash
   # PowerShell command
   Get-ChildItem -Path src\components -Recurse -Filter *.tsx | 
     Select-Object FullName, @{Name="Lines";Expression={(Get-Content $_.FullName).Count}} | 
     Sort-Object Lines -Descending | 
     Format-Table -AutoSize
   ```

2. **For each file >300 lines, document:**
   - Current responsibilities
   - Problems identified
   - Proposed split strategy
   - Estimated effort
   - Risk level
   - Priority

**Example Documentation:**

```markdown
### PropertiesPanel.tsx (~800 lines)

**Current Responsibilities:**
- Layer order controls (4 buttons)
- Align to page controls (5 buttons)
- Position section (X, Y inputs)
- Size section (W, H, rotation)
- Appearance section (opacity)
- Text properties (font, size, color, alignment, style)
- Image properties (replace, filters)
- Effects section (shadow)

**Problems:**
- 8+ distinct responsibilities
- Hard to test individual sections
- Hard to reuse sections
- Performance: Entire panel re-renders on any property change

**Proposed Split:**
```
PropertiesPanel.tsx (100 lines) - Container only
├── LayerOrderSection.tsx (80 lines)
├── AlignmentSection.tsx (100 lines)
├── PositionSection.tsx (60 lines)
├── SizeSection.tsx (80 lines)
├── AppearanceSection.tsx (50 lines)
├── TextPropertiesSection.tsx (200 lines)
├── ImagePropertiesSection.tsx (150 lines)
└── EffectsSection.tsx (100 lines)
```

**Effort:** 12 hours
**Risk:** Medium
**Priority:** HIGH
```

### SMELL 2: CIRCULAR DEPENDENCIES

**Investigation Tool:**

```bash
# Install madge globally
npm install -g madge

# Check for circular dependencies
madge --circular --extensions ts,tsx src/
```

**Document each circular dependency:**

```markdown
### Circular Dependency: EditorCanvas ↔ CanvasManager

**Chain:**
- EditorCanvas imports CanvasManager (for initialization)
- CanvasManager imports Element type from types/
- types/index.ts imports EditorCanvas (for some type?)

**Why it exists:** [reason]

**Impact:** Build warnings, potential runtime errors

**Fix:** Extract types to separate file that both import

**Effort:** 1 hour
```

### SMELL 3: PROP DRILLING

**Investigation:**

```bash
# Find components with many props
grep -r "interface.*Props" src/components/ | wc -l
```

**For each case of 3+ level drilling:**

```markdown
### Prop Drilling: zoom

**Path:** 
EditorLayout → CanvasArea → EditorCanvas → AlignmentGuides

**Intermediate layers:** 2 (EditorLayout, CanvasArea don't use zoom)

**Problem:** EditorLayout and CanvasArea receive zoom just to pass down

**Solution:** AlignmentGuides subscribes to snappingSettingsStore directly

**Benefit:** Remove zoom prop from 2 components

**Effort:** 30 minutes
```

### SMELL 4: DUPLICATE LOGIC

**Common duplications to find:**

```markdown
### Duplicate: Element property updates

**Locations:**
- PropertiesPanel.tsx line 234 - Validates X position
- ElementToolbar.tsx line 89 - Validates X position (different validation!)
- CanvasManager.ts line 156 - No validation

**Duplication:** Validation logic repeated (inconsistently)

**Risk:** PropertiesPanel allows X=0, ElementToolbar allows X=-100

**Fix:** Extract `validateElementUpdate(id, changes)` utility

**Effort:** 2 hours

**Priority:** HIGH (causes bugs)
```

### SMELL 5: TIGHT COUPLING

**Red flags to document:**

```markdown
### Coupling: ElementToolbar → CanvasManager

**Type:** Direct class instance access

**Problem:** 
- ElementToolbar calls `canvasManager.getObjectById()`
- Knows internal implementation of CanvasManager
- Can't test ElementToolbar without real CanvasManager

**Solution:**
- CanvasManager exposes public API only
- ElementToolbar receives data via props (from EditorCanvas)
- Can mock props in tests

**Effort:** 3 hours
```

### SMELL 6: MISSING ABSTRACTIONS

**Repeated patterns:**

```markdown
### Missing: Panel search hook

**Pattern:** Search input + filter state + debounced search

**Occurrences:** 4 times (Templates, Photos, Elements, Layers panels)

**Current approach:** Copy-paste useState + useEffect + setTimeout

**Proposed abstraction:**
```typescript
// useSearchable.ts
function useSearchable<T>(
  items: T[],
  searchField: keyof T,
  debounceMs = 300
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), debounceMs);
    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);
  
  const filtered = useMemo(
    () => items.filter(item => 
      String(item[searchField])
        .toLowerCase()
        .includes(debouncedTerm.toLowerCase())
    ),
    [items, searchField, debouncedTerm]
  );
  
  return { searchTerm, setSearchTerm, filtered };
}
```

**Benefits:** Consistency, testability, DRY

**Effort:** 4 hours (create hook + refactor 4 panels)

**Priority:** MEDIUM
```

### SMELL 7: INCONSISTENT PATTERNS

**Audit checklist:**

```markdown
### State Management Inconsistency

**Finding:**
- LeftSidebar: Uses useState for activePanel
- RightPanel: Uses Zustand store for activeTab
- No documented reason for difference

**Proposed Rule:**
- useState: Truly local UI state (hover, focus, dropdown open)
- Zustand: Shared state accessed by multiple components
- useRef: Imperative handles (DOM refs, CanvasManager, timers)

**Investigation needed:**
- Does any other component need activePanel state? → If no, useState is correct
- Does any other component need activeTab state? → If no, should use useState

**Decision:** Document in ARCHITECTURE.md

**Effort:** 30 minutes
```

### SMELL 8: PERFORMANCE ANTI-PATTERNS

**Investigation commands:**

```bash
# Find useEffect with empty deps (potential missing dependencies)
grep -r "useEffect.*\[\]" src/

# Find inline object creation in JSX
grep -r "style={{" src/

# Find components over 50 lines without React.memo
# (manual review needed)
```

**Document findings:**

```markdown
### Missing Dependency in useEffect

**File:** `src/components/canvas/EditorCanvas.tsx`
**Line:** 145

**Code:**
```typescript
useEffect(() => {
  updateCanvas(selectedElement);
}, []); // ❌ selectedElement not in deps!
```

**Problem:** Stale closure - updateCanvas sees old selectedElement

**Fix:**
```typescript
useEffect(() => {
  updateCanvas(selectedElement);
}, [selectedElement, updateCanvas]);
// OR use useCallback for updateCanvas
```

**Severity:** HIGH (causes bugs)
**Effort:** 15 minutes
```

### SMELL 9: TESTING HOSTILITY

**Audit checklist:**

```markdown
### Untestable: Direct store access in render

**File:** `src/components/panels/PropertiesPanel.tsx`

**Code:**
```typescript
function PropertiesPanel() {
  const element = editorStore.getState().elements[0]; // ❌ Can't mock!
  return <div>{element.name}</div>;
}
```

**Problem:** Can't test without full store setup

**Fix:**
```typescript
function PropertiesPanel() {
  const element = useEditorStore(state => state.elements[0]); // ✅ Can mock hook
  return <div>{element.name}</div>;
}
```

**Testability score:** 2/5 → 5/5 after fix
**Effort:** 30 minutes
```

### SMELL 10: DOCUMENTATION GAPS

**Audit results:**

```markdown
### Missing JSDoc

**Finding:** CanvasManager.ts - 20 public methods, 0 have JSDoc

**Example missing documentation:**
```typescript
// ❌ No documentation
addElement(element: Element) {
  // 50 lines of code
}

// ✅ Should be:
/**
 * Adds a new element to the canvas
 * 
 * @param element - Element data (must have id, type, x, y, width, height)
 * @returns The created Fabric.js object
 * @throws Error if element type is invalid
 * 
 * @example
 * const textElement = {
 *   id: 'abc123',
 *   type: 'text',
 *   x: 100,
 *   y: 100,
 *   width: 200,
 *   height: 50,
 *   text: 'Hello'
 * };
 * const fabricObject = canvasManager.addElement(textElement);
 */
addElement(element: Element): fabric.Object {
  // 50 lines of code
}
```

**Effort:** 8 hours (document all public methods)
**Priority:** MEDIUM (Part of Phase 5)
```

---

## 📦 TASK 1.3: DEPENDENCY AUDIT

**CREATE FILE:** `docs/DEPENDENCIES.md`

### Investigation Commands

```bash
# List all dependencies with sizes
npm list --depth=0

# Check for outdated packages
npm outdated

# Analyze bundle size
npm run build
# Then check .next/analyze/ (if bundle analyzer configured)
```

### Template for Each Dependency

```markdown
## lodash (^4.17.21) 🚨 OPTIMIZATION OPPORTUNITY

**Purpose:** Utility functions (debounce, throttle, cloneDeep, etc.)

**Bundle Size:** ~70KB (if importing entire library)

**Current Usage Investigation:**
```bash
# Find all lodash imports
grep -r "import.*lodash" src/

# Expected findings:
# src/hooks/useDebouncedCallback.ts:1:import debounce from 'lodash/debounce';
# src/lib/utils.ts:3:import _ from 'lodash'; // ❌ BAD! Imports entire library
```

**Is it necessary?** Partially - some functions are useful

**Current Problem:** Likely importing entire library in some files

**Alternative Options:**

| Option | Bundle Size | Effort | Recommendation |
|--------|-------------|--------|----------------|
| Keep lodash, fix imports | ~5KB (only used functions) | 2h | ✅ RECOMMENDED |
| Migrate to lodash-es | ~3KB (tree-shakeable) | 4h | Consider |
| Replace with native JS | 0KB | 8h | Only if time permits |

**Migration Strategy:**

1. **Immediate (Week 1):**
   ```typescript
   // Fix bad imports
   // BEFORE:
   import _ from 'lodash';
   _.debounce(fn, 300);
   
   // AFTER:
   import debounce from 'lodash/debounce';
   debounce(fn, 300);
   ```

2. **Phase 6 (Performance):**
   - Migrate to native JS where simple:
   ```typescript
   // lodash.get → optional chaining
   _.get(obj, 'nested.property') → obj?.nested?.property
   
   // lodash.cloneDeep → structuredClone (native)
   _.cloneDeep(obj) → structuredClone(obj)
   ```

**Estimated Savings:** 50-60KB

**Priority:** HIGH

**Tracking Issue:** #TODO (create GitHub issue)
```

### Dependencies to Analyze

**Priority 1 (Large Impact):**
- fabric (150KB) - KEEP (core)
- lodash (70KB) - OPTIMIZE
- jszip (80KB) - LAZY LOAD or REMOVE
- papaparse (45KB) - LAZY LOAD

**Priority 2 (Medium Impact):**
- @supabase/supabase-js (80KB) - KEEP (core)
- date-fns (20KB tree-shaken) - AUDIT usage

**Priority 3 (Small but worth reviewing):**
- use-image (1KB) - EVALUATE if needed
- nanoid + uuid (4KB combined) - DOCUMENT usage policy

---

## 🗺️ TASK 1.4: CREATE REFACTORING PLAN

**CREATE FILE:** `docs/REFACTORING_PLAN.md`

### Template Structure

```markdown
# Refactoring Plan

## PRIORITY 1: CRITICAL (BLOCKING DEVELOPMENT)

### ISSUE 1.1: LeftSidebar God Component

**Current State:**
- 500+ lines in single file
- 8+ responsibilities

**Desired State:**
- LeftSidebar: 80 lines (layout only)
- 10 separate files

**Blockers:**
- Active panel state management decision
- Panel transition animations
- Lazy loading strategy

**Effort Estimate:** 8 hours
- Hour 1-2: Extract ToolBar + ToolButton
- Hour 3-4: Create PanelManager with routing
- Hour 5-6: Extract first 3 panels
- Hour 7-8: Extract remaining panels, test

**Dependencies:** None (can start immediately)

**Risk Level:** MEDIUM
- Risk: Breaking active panel switching
- Mitigation: Test each panel individually
- Rollback: Keep original file until verified

**Success Criteria:**
- [ ] LeftSidebar.tsx < 100 lines
- [ ] Each panel in separate file
- [ ] All panels lazy-loaded
- [ ] No functionality lost
- [ ] Tests pass

**Priority:** 🔴 CRITICAL
```

### Priority Matrix

| Priority | Criteria | Timeline |
|----------|----------|----------|
| 🔴 CRITICAL | Blocking feature development | Week 1-2 |
| 🟠 HIGH | Causing daily pain | Week 2-3 |
| 🟡 MEDIUM | Will cause problems later | Week 3-6 |
| 🟢 LOW | Polish, nice to have | Week 6-8 |

---

## ✅ PHASE 1 COMPLETION CHECKLIST

### Documentation Files
- [x] docs/ARCHITECTURE.md created
- [x] docs/PROGRESS.md created
- [ ] docs/TECHNICAL_DEBT.md created
- [ ] docs/DEPENDENCIES.md created
- [ ] docs/REFACTORING_PLAN.md created

### Understanding Achieved
- [x] Directory structure mapped
- [x] Data flows documented
- [x] Technology stack explained
- [ ] All architectural smells identified
- [ ] All dependencies analyzed
- [ ] Refactoring priorities set

### Quick Wins (Optional)
- [ ] Error Boundaries added (4h)
- [ ] Bundle analyzer configured (2h)
- [ ] nanoid vs uuid usage documented (30min)

---

## 🚀 NEXT STEPS

### After Completing Documentation

1. **Team Review** (if applicable):
   - Share docs with team
   - Discuss priorities
   - Get buy-in for refactoring time

2. **Begin Execution:**
   - Start with Priority 1, Issue 1 (safest)
   - Track progress in PROGRESS.md
   - Commit after each completed issue

3. **Daily Updates:**
   - Update PROGRESS.md daily log
   - Document challenges and solutions
   - Celebrate milestones

### Recommended Execution Order

**Week 1 (Priority 1 - 34 hours):**
1. Add Error Boundaries (4h) - Quick win
2. Refactor LeftSidebar (8h) - Unblocks panel work
3. Enable TypeScript Strict Mode (12h) - Catch bugs
4. Refactor EditorCanvas (10h) - Unblocks canvas work

**Week 2-3 (Priority 2 - 13 hours):**
5. Fix Hot Reload (4h)
6. Reorganize Components (6h)
7. Fix Prop Drilling (3h)

**Week 4-8 (Priority 3 & Testing):**
8. Write Tests (40h) - Phase 3
9. Documentation (20h) - Phase 5
10. Performance (20h) - Phase 6

---

## 📚 USEFUL COMMANDS REFERENCE

### Code Analysis

```bash
# Find large files
Get-ChildItem -Recurse *.tsx,*.ts | 
  Select-Object FullName, @{Name="Lines";Expression={(Get-Content $_.FullName).Count}} | 
  Where-Object {$_.Lines -gt 300} | 
  Sort-Object Lines -Descending

# Find circular dependencies
madge --circular --extensions ts,tsx src/

# Find TODO comments
grep -r "TODO\|FIXME\|HACK" src/

# Count TypeScript errors
npm run build 2>&1 | grep "error TS" | wc -l
```

### Bundle Analysis

```bash
# Install analyzer
npm install --save-dev @next/bundle-analyzer

# Configure in next.config.js
# Then build and analyze
ANALYZE=true npm run build
```

### Dependency Analysis

```bash
# Check outdated
npm outdated

# Check security vulnerabilities
npm audit

# Check dependency tree
npm list <package-name>

# Check bundle size of package
npm install -g bundlephobia-cli
bundlephobia [package-name]
```

---

**Last Updated:** 2025-12-15  
**Phase:** 1 - Codebase Archaeology  
**Status:** In Progress  
**Next:** Create TECHNICAL_DEBT.md
