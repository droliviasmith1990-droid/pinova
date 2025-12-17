'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TemplateListItem } from '@/lib/db/templates';

// ============================================
// Types
// ============================================
export type WizardStep = 1 | 2 | 3 | 4;

export interface CSVData {
    headers: string[];
    rows: Record<string, string>[];
    fileName: string;
    rowCount: number;
    sourceUrl?: string;  // URL for CSV imported from URL
}

export interface FieldMapping {
    [templateField: string]: string; // templateField -> csvColumn
}

export type PreviewStatus = 'idle' | 'generating' | 'ready' | 'error';

export interface CampaignWizardState {
    currentStep: WizardStep;
    csvData: CSVData | null;
    selectedTemplate: TemplateListItem | null;
    fieldMapping: FieldMapping;
    campaignName: string;
    campaignDescription: string;
    previewStatus: PreviewStatus;
}

export interface CampaignWizardActions {
    // Step navigation (kept for backward compatibility)
    setStep: (step: WizardStep) => void;
    nextStep: () => void;
    prevStep: () => void;
    
    // Data setters
    setCSVData: (data: CSVData | null) => void;
    setSelectedTemplate: (template: TemplateListItem | null) => void;
    setFieldMapping: (mapping: FieldMapping) => void;
    updateFieldMapping: (field: string, column: string) => void;
    setCampaignName: (name: string) => void;
    setCampaignDescription: (description: string) => void;
    setPreviewStatus: (status: PreviewStatus) => void;
    resetWizard: () => void;
    
    // Validation
    canProceed: () => boolean;
    getValidationErrors: () => string[];
    isFormValid: () => boolean;
}

type CampaignWizardContextType = CampaignWizardState & CampaignWizardActions;

// ============================================
// Initial State
// ============================================
const initialState: CampaignWizardState = {
    currentStep: 1,
    csvData: null,
    selectedTemplate: null,
    fieldMapping: {},
    campaignName: '',
    campaignDescription: '',
    previewStatus: 'idle',
};

// ============================================
// Context
// ============================================
const CampaignWizardContext = createContext<CampaignWizardContextType | undefined>(undefined);

// ============================================
// Provider
// ============================================
export function CampaignWizardProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CampaignWizardState>(initialState);

    // Step navigation (kept for backward compatibility)
    const setStep = useCallback((step: WizardStep) => {
        setState((prev) => ({ ...prev, currentStep: step }));
    }, []);

    const nextStep = useCallback(() => {
        setState((prev) => {
            if (prev.currentStep < 4) {
                return { ...prev, currentStep: (prev.currentStep + 1) as WizardStep };
            }
            return prev;
        });
    }, []);

    const prevStep = useCallback(() => {
        setState((prev) => {
            if (prev.currentStep > 1) {
                return { ...prev, currentStep: (prev.currentStep - 1) as WizardStep };
            }
            return prev;
        });
    }, []);

    // Data setters
    const setCSVData = useCallback((data: CSVData | null) => {
        setState((prev) => ({ ...prev, csvData: data }));
    }, []);

    const setSelectedTemplate = useCallback((template: TemplateListItem | null) => {
        // Clear field mapping when template changes
        setState((prev) => ({ ...prev, selectedTemplate: template, fieldMapping: {} }));
    }, []);

    const setFieldMapping = useCallback((mapping: FieldMapping) => {
        setState((prev) => ({ ...prev, fieldMapping: mapping }));
    }, []);

    const updateFieldMapping = useCallback((field: string, column: string) => {
        setState((prev) => ({
            ...prev,
            fieldMapping: { ...prev.fieldMapping, [field]: column },
        }));
    }, []);

    const setCampaignName = useCallback((name: string) => {
        setState((prev) => ({ ...prev, campaignName: name }));
    }, []);

    const setCampaignDescription = useCallback((description: string) => {
        setState((prev) => ({ ...prev, campaignDescription: description }));
    }, []);

    const setPreviewStatus = useCallback((status: PreviewStatus) => {
        setState((prev) => ({ ...prev, previewStatus: status }));
    }, []);

    const resetWizard = useCallback(() => {
        setState(initialState);
    }, []);

    // Step-based validation (kept for backward compatibility)
    const canProceed = useCallback(() => {
        switch (state.currentStep) {
            case 1:
                return state.csvData !== null && state.csvData.rowCount > 0;
            case 2:
                return state.selectedTemplate !== null;
            case 3:
                return Object.keys(state.fieldMapping).length > 0;
            case 4:
                return state.campaignName.trim().length > 0;
            default:
                return false;
        }
    }, [state]);

    // Form-wide validation for single-page mode
    const getValidationErrors = useCallback((): string[] => {
        const errors: string[] = [];
        
        if (!state.campaignName.trim()) {
            errors.push('Campaign name is required');
        }
        
        if (!state.csvData) {
            errors.push('CSV file is required');
        }
        
        if (!state.selectedTemplate) {
            errors.push('Please select a template');
        }
        
        if (state.selectedTemplate && Object.keys(state.fieldMapping).length === 0) {
            errors.push('Please map at least one field');
        }
        
        return errors;
    }, [state]);

    const isFormValid = useCallback((): boolean => {
        return getValidationErrors().length === 0;
    }, [getValidationErrors]);

    const value: CampaignWizardContextType = {
        ...state,
        setStep,
        nextStep,
        prevStep,
        setCSVData,
        setSelectedTemplate,
        setFieldMapping,
        updateFieldMapping,
        setCampaignName,
        setCampaignDescription,
        setPreviewStatus,
        resetWizard,
        canProceed,
        getValidationErrors,
        isFormValid,
    };

    return (
        <CampaignWizardContext.Provider value={value}>
            {children}
        </CampaignWizardContext.Provider>
    );
}

// ============================================
// Hook
// ============================================
export function useCampaignWizard() {
    const context = useContext(CampaignWizardContext);
    if (context === undefined) {
        throw new Error('useCampaignWizard must be used within a CampaignWizardProvider');
    }
    return context;
}

