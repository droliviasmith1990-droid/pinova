/**
 * Store Exports
 * 
 * Central export point for all stores.
 * The editorStore is being split into specialized stores for better separation of concerns.
 * 
 * Store Architecture (7 specialized stores):
 * - selectionStore: Element selection management
 * - canvasStore: Canvas size, background, zoom
 * - templateStore: Template metadata and gallery
 * - historyStore: Undo/redo with state snapshots
 * - layersStore: Layer ordering operations
 * - elementsStore: Element CRUD operations
 * - alignmentStore: Element alignment and distribution
 */

// Legacy store (still used as primary, new stores used for testing/reference)
export { useEditorStore, useHydrated } from './editorStore';

// Specialized stores (extracted from editorStore)
export { useSelectionStore } from './selectionStore';
export { useCanvasStore } from './canvasStore';
export { useTemplateStore } from './templateStore';
export { useHistoryStore } from './historyStore';
export { useLayersStore } from './layersStore';
export { useElementsStore } from './elementsStore';
export { useAlignmentStore } from './alignmentStore';

// Other stores
export { useSnappingSettingsStore } from './snappingSettingsStore';
export { useToastStore } from './toastStore';
export { useGenerationStore } from './generationStore';

// Re-export types
export type { SelectionState, SelectionActions } from './selectionStore';
export type { CanvasState, CanvasActions } from './canvasStore';
export type { TemplateState, TemplateActions, TemplateListItem } from './templateStore';
export type { HistoryState, HistoryActions, HistorySnapshot } from './historyStore';
export type { LayersState, LayersActions } from './layersStore';
export type { ElementsState, ElementsActions } from './elementsStore';
export type { AlignmentState, AlignmentActions, Alignment, DistributeDirection } from './alignmentStore';
