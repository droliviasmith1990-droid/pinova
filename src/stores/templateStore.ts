/**
 * Template Store
 * 
 * Manages template metadata and template list for the gallery.
 * Extracted from editorStore for better separation of concerns.
 * 
 * Features:
 * - Template ID and name
 * - Template source (native or canva_import)
 * - New template flag
 * - Saving state
 * - Template gallery list
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '@/lib/utils';

interface TemplateListItem {
    id: string;
    name: string;
    thumbnail_url?: string;
}

interface TemplateState {
    templateId: string;
    templateName: string;
    templateSource: 'native' | 'canva_import';
    isNewTemplate: boolean;
    isSaving: boolean;
    templates: TemplateListItem[];
}

interface TemplateActions {
    setTemplateName: (name: string) => void;
    setTemplateSource: (source: 'native' | 'canva_import') => void;
    setIsNewTemplate: (isNew: boolean) => void;
    setIsSaving: (saving: boolean) => void;
    setTemplates: (templates: TemplateListItem[]) => void;
    setTemplateId: (id: string) => void;
    resetTemplate: () => void;
}

const initialState: TemplateState = {
    templateId: generateId(),
    templateName: 'Untitled Template',
    templateSource: 'native',
    isNewTemplate: true,
    isSaving: false,
    templates: [],
};

export const useTemplateStore = create<TemplateState & TemplateActions>()(
    persist(
        (set) => ({
            // Initial state
            ...initialState,

            // Actions
            setTemplateName: (name) => set({ templateName: name }),

            setTemplateSource: (source) => set({ templateSource: source }),

            setIsNewTemplate: (isNew) => set({ isNewTemplate: isNew }),

            setIsSaving: (saving) => set({ isSaving: saving }),

            setTemplates: (templates) => set({ templates }),

            setTemplateId: (id) => set({ templateId: id }),

            resetTemplate: () => set({
                templateId: generateId(),
                templateName: 'Untitled Template',
                templateSource: 'native',
                isNewTemplate: true,
            }),
        }),
        {
            name: 'pinterest-template-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist these fields
                templateId: state.templateId,
                templateName: state.templateName,
                templateSource: state.templateSource,
                isNewTemplate: state.isNewTemplate,
            }),
        }
    )
);

// Type export for consumers
export type { TemplateState, TemplateActions, TemplateListItem };
