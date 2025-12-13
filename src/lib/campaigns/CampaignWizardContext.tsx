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

export interface CampaignWizardState {
    currentStep: WizardStep;
    csvData: CSVData | null;
    selectedTemplate: TemplateListItem | null;
    fieldMapping: FieldMapping;
    campaignName: string;
}

export interface CampaignWizardActions {
    setStep: (step: WizardStep) => void;
    nextStep: () => void;
    prevStep: () => void;
    setCSVData: (data: CSVData | null) => void;
    setSelectedTemplate: (template: TemplateListItem | null) => void;
    setFieldMapping: (mapping: FieldMapping) => void;
    updateFieldMapping: (field: string, column: string) => void;
    setCampaignName: (name: string) => void;
    resetWizard: () => void;
    canProceed: () => boolean;
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

    const setCSVData = useCallback((data: CSVData | null) => {
        setState((prev) => ({ ...prev, csvData: data }));
    }, []);

    const setSelectedTemplate = useCallback((template: TemplateListItem | null) => {
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

    const resetWizard = useCallback(() => {
        setState(initialState);
    }, []);

    const canProceed = useCallback(() => {
        switch (state.currentStep) {
            case 1:
                return state.csvData !== null && state.csvData.rowCount > 0;
            case 2:
                return state.selectedTemplate !== null;
            case 3:
                // All fields must be mapped (simplified - in real app check template fields)
                return Object.keys(state.fieldMapping).length > 0;
            case 4:
                return state.campaignName.trim().length > 0;
            default:
                return false;
        }
    }, [state]);

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
        resetWizard,
        canProceed,
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
