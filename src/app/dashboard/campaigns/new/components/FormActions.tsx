'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { createCampaign } from '@/lib/db/campaigns';
import { toast } from 'sonner';

interface FormActionsProps {
    className?: string;
}

export function FormActions({ className }: FormActionsProps) {
    const router = useRouter();
    const { 
        campaignName, 
        csvData, 
        selectedTemplate, 
        fieldMapping,
        previewStatus,
        isFormValid,
        getValidationErrors 
    } = useCampaignWizard();
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleBack = () => {
        router.push('/dashboard/campaigns');
    };

    const handleSubmit = async () => {
        // Check preview is ready
        if (previewStatus !== 'ready') {
            toast.error('Please wait for previews to complete', {
                description: 'Preview generation must be completed before creating the campaign.'
            });
            return;
        }

        // Final validation
        const errors = getValidationErrors();
        if (errors.length > 0) {
            toast.error('Please fix the following issues:', {
                description: errors.join(', ')
            });
            return;
        }

        if (!csvData || !selectedTemplate) {
            toast.error('Missing required data');
            return;
        }

        setIsSubmitting(true);

        try {
            const campaign = await createCampaign({
                name: campaignName.trim(),
                template_id: selectedTemplate.id,
                csv_data: csvData.rows,
                field_mapping: fieldMapping,
                total_pins: csvData.rowCount
            });

            if (campaign) {
                toast.success('Campaign created successfully!');
                router.push(`/dashboard/campaigns/${campaign.id}`);
            } else {
                throw new Error('Failed to create campaign');
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
            toast.error('Failed to create campaign', {
                description: 'Please try again or contact support if the issue persists.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Preview must be ready AND form valid to submit
    const canSubmit = isFormValid() && previewStatus === 'ready' && !isSubmitting;
    
    // Show status indicator when preview is generating
    const showPreviewIndicator = previewStatus === 'generating' || previewStatus === 'error';

    return (
        <div className={cn(
            "sticky bottom-6 z-40 bg-white/80 backdrop-blur-md rounded-2xl shadow-creative-lg border border-white/40 p-4 mt-8 flex items-center justify-between animate-in slide-in-from-bottom-6 duration-500",
            className
        )}>
            {/* Back Button */}
            <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 text-gray-600 font-medium hover:text-gray-900 hover:bg-white/50 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
            </button>

            {/* Create Campaign Button */}
            <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                    "relative overflow-hidden group flex items-center gap-3 px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 transform",
                    canSubmit
                        ? "bg-gradient-to-r from-primary-creative to-accent-1 text-white hover:shadow-primary-creative/30 hover:scale-105 active:scale-95"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                )}
            >
                {/* Shine effect */}
                {canSubmit && !isSubmitting && (
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                )}

                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin relative z-20" />
                        <span className="relative z-20">Creating Campaign...</span>
                    </>
                ) : (
                    <>
                        <span className="relative z-20">Create Campaign</span>
                        <div className="relative z-20 p-1 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform duration-300">
                             <Rocket className="w-4 h-4 fill-current" />
                        </div>
                    </>
                )}
            </button>
        </div>
    );
}
