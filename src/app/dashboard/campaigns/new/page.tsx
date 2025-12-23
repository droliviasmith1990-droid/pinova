'use client';

import React, { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { CampaignWizardProvider, useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { getTemplate, TemplateListItem } from '@/lib/db/templates';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
    ConfigurationSidebar, 
    TemplateLibrarySection, 
    FieldMappingSection, 
    FormActions 
} from './components';
import { PreviewSection } from '@/components/campaign/PreviewSection';

function StepIndicator() {
    const { campaignName, csvData, selectedTemplate, selectedTemplates, selectionMode, fieldMapping } = useCampaignWizard();
    
    // Determine if a template is selected (either single or multi mode)
    const hasTemplateSelected = selectionMode === 'multiple' 
        ? selectedTemplates.length > 0 
        : !!selectedTemplate;

    const steps = [
        { id: 1, name: 'Setup', status: campaignName && csvData ? 'completed' : 'current' },
        { id: 2, name: 'Template', status: hasTemplateSelected ? 'completed' : (campaignName && csvData ? 'current' : 'pending') },
        { id: 3, name: 'Mapping', status: Object.keys(fieldMapping).length > 0 ? 'completed' : (hasTemplateSelected ? 'current' : 'pending') },
        { id: 4, name: 'Preview', status: Object.keys(fieldMapping).length > 0 ? 'current' : 'pending' },
    ];

    return (
        <div className="flex items-center gap-2">
            {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300",
                        step.status === 'completed' ? "bg-green-100 text-green-700" :
                        step.status === 'current' ? "bg-primary-creative/10 text-primary-creative ring-1 ring-primary-creative/20" :
                        "text-gray-400"
                    )}>
                        <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                            step.status === 'completed' ? "bg-green-500 text-white" :
                            step.status === 'current' ? "bg-primary-creative text-white" :
                            "bg-gray-200 text-gray-500"
                        )}>
                            {step.status === 'completed' ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
                        </div>
                        <span>{step.name}</span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className="w-6 h-px bg-gray-200 mx-1" />
                    )}
                </div>
            ))}
        </div>
    );
}

function SinglePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { selectedTemplate, selectedTemplates, selectionMode, setSelectedTemplate, csvData, fieldMapping } = useCampaignWizard();
    const fieldMappingRef = useRef<HTMLDivElement>(null);
    const hasLoadedFromUrlRef = useRef(false);
    
    // Determine if a template is selected (either single or multi mode)
    const hasTemplateSelected = selectionMode === 'multiple' 
        ? selectedTemplates.length > 0 
        : !!selectedTemplate;

    // Load template from URL parameter on mount
    useEffect(() => {
        const templateId = searchParams.get('templateId');
        if (!templateId || hasLoadedFromUrlRef.current) return;
        
        hasLoadedFromUrlRef.current = true;
        
        const loadTemplateFromUrl = async () => {
            try {
                const template = await getTemplate(templateId);
                if (template) {
                    // Convert to TemplateListItem format
                    const templateListItem: TemplateListItem = {
                        id: template.id,
                        name: template.name,
                        thumbnail_url: template.thumbnail_url || null,
                        is_featured: template.is_featured || false,
                        category: null,
                        category_id: template.category_id || null,
                        category_data: null,
                        tags: [],
                        view_count: 0,
                        created_at: template.created_at || template.updated_at,
                        updated_at: template.updated_at,
                    };
                    setSelectedTemplate(templateListItem);
                    toast.success(`Template "${template.name}" selected`);
                    
                    // Scroll to field mapping
                    setTimeout(() => {
                        fieldMappingRef.current?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    }, 300);
                } else {
                    toast.error('Template not found');
                }
            } catch (error) {
                console.error('Error loading template from URL:', error);
                toast.error('Failed to load template');
            }
        };
        
        loadTemplateFromUrl();
    }, [searchParams, setSelectedTemplate]);

    // Scroll to field mapping when template is selected
    const scrollToFieldMapping = () => {
        setTimeout(() => {
            fieldMappingRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 transition-all duration-300">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div>
                                <h1 className="font-heading font-bold text-xl text-gray-900">New Campaign</h1>
                            </div>
                            
                            {/* Desktop Steps */}
                            <div className="hidden lg:block">
                                <StepIndicator />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                             <button
                                onClick={() => router.push('/dashboard/campaigns')}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-full transition-all"
                            >
                                <X className="w-4 h-4" />
                                <span className="hidden sm:inline">Cancel</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
                {/* Configuration Section - Horizontal */}
                <ConfigurationSidebar horizontal />

                {/* Mobile Steps */}
                <div className="lg:hidden bg-white p-4 rounded-xl border border-gray-200">
                     <StepIndicator />
                </div>

                {/* Template Library */}
                <div className="bg-transparent rounded-3xl transition-all duration-500">
                    <TemplateLibrarySection 
                        onTemplateSelect={scrollToFieldMapping}
                    />
                </div>

                {/* Field Mapping (conditional) */}
                <div 
                    ref={fieldMappingRef} 
                    className={cn(
                        "transition-all duration-700 ease-out relative z-30",
                        hasTemplateSelected ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none h-0"
                    )}
                >
                    {hasTemplateSelected && <FieldMappingSection />}
                </div>

                {/* Preview Section - Shows after field mapping is configured */}
                <div className={cn(
                    "transition-all duration-700 ease-out delay-100 relative z-10",
                    hasTemplateSelected && csvData && Object.keys(fieldMapping).length > 0
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-10 pointer-events-none h-0 overflow-hidden"
                )}>
                    {hasTemplateSelected && csvData && Object.keys(fieldMapping).length > 0 && (
                        <PreviewSection />
                    )}
                </div>
                
                 {/* Form Actions */}
                 <FormActions />
            </main>
        </div>
    );
}

export default function NewCampaignPage() {
    const router = useRouter();
    const { currentUser, loading } = useAuth();

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !currentUser) {
            router.push('/login');
        }
    }, [loading, currentUser, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary-creative" />
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    return (
        <CampaignWizardProvider>
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-creative" />
                </div>
            }>
                <SinglePageContent />
            </Suspense>
        </CampaignWizardProvider>
    );
}
