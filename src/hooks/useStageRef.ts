// useStageRef - Shared Konva Stage ref between components
// This allows the Header to access the Stage for thumbnail generation

import { useRef, useCallback, MutableRefObject } from 'react';
import Konva from 'konva';
import { create } from 'zustand';

// Store for the stage ref - allows sharing between components
interface StageRefStore {
    stageRef: MutableRefObject<Konva.Stage | null> | null;
    setStageRef: (ref: MutableRefObject<Konva.Stage | null>) => void;
}

export const useStageRefStore = create<StageRefStore>((set) => ({
    stageRef: null,
    setStageRef: (ref) => set({ stageRef: ref }),
}));

// Hook to create and register the stage ref (used in EditorCanvas)
export function useCreateStageRef() {
    const stageRef = useRef<Konva.Stage | null>(null);
    const setStageRef = useStageRefStore((s) => s.setStageRef);

    // Register the ref on mount
    const registerRef = useCallback(() => {
        setStageRef(stageRef);
    }, [setStageRef]);

    return { stageRef, registerRef };
}

// Hook to access the stage ref (used in Header and other components)
export function useStageRef(): MutableRefObject<Konva.Stage | null> | null {
    const stageRef = useStageRefStore((s) => s.stageRef);
    return stageRef;
}
