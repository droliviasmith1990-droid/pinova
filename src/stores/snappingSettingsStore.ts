import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SnappingSettings {
    // Object Snapping
    snapToObjects: boolean;
    objectEdges: boolean;
    objectCenters: boolean;
    equalSpacing: boolean;
    distanceIndicators: boolean;

    // Canvas Boundaries
    snapToBoundaries: boolean;
    boundaryIndicators: boolean;
    preventOffCanvas: boolean;

    // Guides & Grids
    showGuideLines: boolean;
    canvasCenterLines: boolean;
    gridSnapping: boolean;
    gridSize: number;
    smartGuides: boolean;

    // Magnetic Strength
    magneticSnapping: boolean;
    snapSensitivity: number;
    magneticStrength: 'weak' | 'medium' | 'strong';
    precisionLock: boolean;
    magneticSnapThreshold: number; // 3px default - auto-snap when within this distance

    // Visual Feedback
    guideAnimations: boolean;
    snapCelebrations: boolean;
    multiLineGuides: boolean;
    guideColor: string;

    // Collision Detection (NEW)
    preventOverlap: boolean;
    autoPushElements: boolean;
    minimumSpacing: number;
    collisionIndicators: boolean;
    collisionMode: 'block' | 'push' | 'freeform';
}

interface SnappingSettingsStore extends SnappingSettings {
    // Actions
    setSnapToObjects: (value: boolean) => void;
    setObjectEdges: (value: boolean) => void;
    setObjectCenters: (value: boolean) => void;
    setEqualSpacing: (value: boolean) => void;
    setDistanceIndicators: (value: boolean) => void;

    setSnapToBoundaries: (value: boolean) => void;
    setBoundaryIndicators: (value: boolean) => void;
    setPreventOffCanvas: (value: boolean) => void;

    setShowGuideLines: (value: boolean) => void;
    setCanvasCenterLines: (value: boolean) => void;
    setGridSnapping: (value: boolean) => void;
    setGridSize: (value: number) => void;
    setSmartGuides: (value: boolean) => void;

    setMagneticSnapping: (value: boolean) => void;
    setSnapSensitivity: (value: number) => void;
    setMagneticStrength: (value: 'weak' | 'medium' | 'strong') => void;
    setPrecisionLock: (value: boolean) => void;
    setMagneticSnapThreshold: (value: number) => void;

    setGuideAnimations: (value: boolean) => void;
    setSnapCelebrations: (value: boolean) => void;
    setMultiLineGuides: (value: boolean) => void;
    setGuideColor: (value: string) => void;

    // Collision Detection Actions (NEW)
    setPreventOverlap: (value: boolean) => void;
    setAutoPushElements: (value: boolean) => void;
    setMinimumSpacing: (value: number) => void;
    setCollisionIndicators: (value: boolean) => void;
    setCollisionMode: (value: 'block' | 'push' | 'freeform') => void;

    // Presets
    applyPreset: (preset: 'beginner' | 'precision' | 'freeform' | 'professional') => void;
    resetToDefaults: () => void;
}

const defaultSettings: SnappingSettings = {
    // Object Snapping
    snapToObjects: true,
    objectEdges: true,
    objectCenters: true,
    equalSpacing: true,
    distanceIndicators: true,

    // Canvas Boundaries
    snapToBoundaries: true,
    boundaryIndicators: false,
    preventOffCanvas: true,

    // Guides & Grids
    showGuideLines: true,
    canvasCenterLines: true,
    gridSnapping: false,
    gridSize: 8,
    smartGuides: true,

    // Magnetic Strength
    magneticSnapping: true,
    snapSensitivity: 10,
    magneticStrength: 'medium',
    precisionLock: true,
    magneticSnapThreshold: 3, // Auto-snap when within 3px

    // Visual Feedback
    guideAnimations: true,
    snapCelebrations: true,
    multiLineGuides: false,
    guideColor: '#F63E97',

    // Collision Detection (NEW)
    preventOverlap: true,
    autoPushElements: false,
    minimumSpacing: 10,
    collisionIndicators: true,
    collisionMode: 'block',
};

const presets: Record<string, Partial<SnappingSettings>> = {
    beginner: {
        snapToObjects: true,
        objectEdges: true,
        objectCenters: false,
        equalSpacing: false,
        distanceIndicators: false,
        snapToBoundaries: true,
        magneticSnapping: true,
        snapSensitivity: 15,
        magneticStrength: 'strong',
        guideAnimations: true,
        snapCelebrations: true,
    },
    precision: {
        snapToObjects: true,
        objectEdges: true,
        objectCenters: true,
        equalSpacing: true,
        distanceIndicators: true,
        snapToBoundaries: true,
        gridSnapping: true,
        gridSize: 8,
        magneticSnapping: true,
        snapSensitivity: 6,
        magneticStrength: 'medium',
        precisionLock: true,
        multiLineGuides: false,
    },
    freeform: {
        snapToObjects: false,
        snapToBoundaries: false,
        showGuideLines: false,
        magneticSnapping: false,
        gridSnapping: false,
        distanceIndicators: false,
    },
    professional: {
        snapToObjects: true,
        objectEdges: true,
        objectCenters: true,
        equalSpacing: true,
        distanceIndicators: true,
        snapToBoundaries: true,
        boundaryIndicators: true,
        preventOffCanvas: true,
        showGuideLines: true,
        canvasCenterLines: true,
        gridSnapping: true,
        gridSize: 8,
        smartGuides: true,
        magneticSnapping: true,
        snapSensitivity: 10,
        magneticStrength: 'strong',
        precisionLock: true,
        guideAnimations: true,
        snapCelebrations: true,
        preventOverlap: true,
        autoPushElements: true,
        minimumSpacing: 15,
        collisionIndicators: true,
        collisionMode: 'push',
    },
};

export const useSnappingSettingsStore = create<SnappingSettingsStore>()(
    persist(
        (set) => ({
            ...defaultSettings,

            // Object Snapping Actions
            setSnapToObjects: (value) => set({ snapToObjects: value }),
            setObjectEdges: (value) => set({ objectEdges: value }),
            setObjectCenters: (value) => set({ objectCenters: value }),
            setEqualSpacing: (value) => set({ equalSpacing: value }),
            setDistanceIndicators: (value) => set({ distanceIndicators: value }),

            // Canvas Boundaries Actions
            setSnapToBoundaries: (value) => set({ snapToBoundaries: value }),
            setBoundaryIndicators: (value) => set({ boundaryIndicators: value }),
            setPreventOffCanvas: (value) => set({ preventOffCanvas: value }),

            // Guides & Grids Actions
            setShowGuideLines: (value) => set({ showGuideLines: value }),
            setCanvasCenterLines: (value) => set({ canvasCenterLines: value }),
            setGridSnapping: (value) => set({ gridSnapping: value }),
            setGridSize: (value) => set({ gridSize: value }),
            setSmartGuides: (value) => set({ smartGuides: value }),

            // Magnetic Strength Actions
            setMagneticSnapping: (value) => set({ magneticSnapping: value }),
            setSnapSensitivity: (value) => set({ snapSensitivity: value }),
            setMagneticStrength: (value) => set({ magneticStrength: value }),
            setPrecisionLock: (value) => set({ precisionLock: value }),
            setMagneticSnapThreshold: (value) => set({ magneticSnapThreshold: value }),

            // Visual Feedback Actions
            setGuideAnimations: (value) => set({ guideAnimations: value }),
            setSnapCelebrations: (value) => set({ snapCelebrations: value }),
            setMultiLineGuides: (value) => set({ multiLineGuides: value }),
            setGuideColor: (value) => set({ guideColor: value }),

            // Collision Detection Actions (NEW)
            setPreventOverlap: (value) => set({ preventOverlap: value }),
            setAutoPushElements: (value) => set({ autoPushElements: value }),
            setMinimumSpacing: (value) => set({ minimumSpacing: value }),
            setCollisionIndicators: (value) => set({ collisionIndicators: value }),
            setCollisionMode: (value) => set({ collisionMode: value }),

            // Presets
            applyPreset: (preset) => set({ ...defaultSettings, ...presets[preset] }),
            resetToDefaults: () => set(defaultSettings),
        }),
        {
            name: 'snapping-settings',
        }
    )
);
