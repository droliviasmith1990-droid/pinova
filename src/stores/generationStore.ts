/**
 * Generation State Store
 * Manages generation progress persistence for resume capability
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GenerationState {
    campaignId: string;
    lastCompletedIndex: number;
    totalPins: number;
    status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed';
    timestamp: number;
    userId?: string;
}

interface GenerationStore {
    // Active generations keyed by campaign ID
    generations: Record<string, GenerationState>;

    // Actions
    saveGenerationProgress: (state: GenerationState) => void;
    loadGenerationProgress: (campaignId: string) => GenerationState | null;
    clearGenerationProgress: (campaignId: string) => void;
    clearAllProgress: () => void;

    // Check if generation is stale (>24h old)
    isGenerationStale: (campaignId: string) => boolean;
}

// 24 hours in milliseconds
const STALE_THRESHOLD = 24 * 60 * 60 * 1000;

export const useGenerationStore = create<GenerationStore>()(
    persist(
        (set, get) => ({
            generations: {},

            saveGenerationProgress: (state: GenerationState) => {
                // Debug log removed - was causing performance issues (PERF-002)
                set((store) => ({
                    generations: {
                        ...store.generations,
                        [state.campaignId]: {
                            ...state,
                            timestamp: Date.now()
                        }
                    }
                }));
            },

            loadGenerationProgress: (campaignId: string) => {
                const state = get().generations[campaignId];
                return state || null;
            },

            clearGenerationProgress: (campaignId: string) => {
                set((store) => {
                    const { [campaignId]: _, ...rest } = store.generations;
                    return { generations: rest };
                });
            },

            clearAllProgress: () => {
                set({ generations: {} });
            },

            isGenerationStale: (campaignId: string) => {
                const state = get().generations[campaignId];
                if (!state) return false;

                const age = Date.now() - state.timestamp;
                return age > STALE_THRESHOLD;
            }
        }),
        {
            name: 'generation-store',
            // Optional: Use Supabase for cross-device sync
            // partialize: (state) => ({ generations: state.generations }),
        }
    )
);

/**
 * React hook to manage campaign generation state
 */
export function useCampaignGeneration(campaignId: string) {
    const store = useGenerationStore();

    const state = store.loadGenerationProgress(campaignId);
    const isStale = store.isGenerationStale(campaignId);

    const save = (updates: Partial<GenerationState>) => {
        const current = store.loadGenerationProgress(campaignId) || {
            campaignId,
            lastCompletedIndex: 0,
            totalPins: 0,
            status: 'pending' as const,
            timestamp: Date.now()
        };

        store.saveGenerationProgress({
            ...current,
            ...updates
        });
    };

    const clear = () => {
        store.clearGenerationProgress(campaignId);
    };

    return {
        state,
        isStale,
        save,
        clear,
        // Allow resume if there's saved state that's not stale, not completed, and has progress
        canResume: state && !isStale &&
            state.lastCompletedIndex >= -1 &&
            state.status !== 'completed' &&
            state.lastCompletedIndex < state.totalPins
    };
}
