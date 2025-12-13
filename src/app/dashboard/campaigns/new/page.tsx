'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { CampaignWizardProvider, useCampaignWizard, WizardStep } from '@/lib/campaigns/CampaignWizardContext';
import { ProgressStepper } from '@/components/campaign/ProgressStepper';
import { StepUploadCSV } from '@/components/campaign/StepUploadCSV';
import { StepSelectTemplate } from '@/components/campaign/StepSelectTemplate';
import { StepMapFields } from '@/components/campaign/StepMapFields';
import { StepReviewLaunch } from '@/components/campaign/StepReviewLaunch';
import { Loader2 } from 'lucide-react';

function WizardContent() {
    const router = useRouter();
    const { currentStep, setStep, nextStep, prevStep, canProceed, csvData, selectedTemplate, fieldMapping } = useCampaignWizard();

    // Custom canProceed logic for each step
    const canProceedStep = (): boolean => {
        switch (currentStep) {
            case 1:
                return csvData !== null && csvData.rowCount > 0;
            case 2:
                return selectedTemplate !== null;
            case 3:
                return Object.keys(fieldMapping).length > 0;
            case 4:
                return true; // Launch button handles its own validation
            default:
                return false;
        }
    };

    const handleStepClick = (step: WizardStep) => {
        if (step < currentStep) {
            setStep(step);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <StepUploadCSV />;
            case 2:
                return <StepSelectTemplate />;
            case 3:
                return <StepMapFields />;
            case 4:
                return <StepReviewLaunch />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
                        <p className="text-gray-600 text-sm">Generate multiple pins from your data in 4 easy steps</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/campaigns')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                        Cancel
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Progress Stepper */}
                <div className="mb-8">
                    <ProgressStepper currentStep={currentStep} onStepClick={handleStepClick} />
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[500px]">
                    {renderStep()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-6">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                            currentStep === 1
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-gray-700 hover:bg-gray-100"
                        )}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>

                    {currentStep < 4 && (
                        <button
                            onClick={nextStep}
                            disabled={!canProceedStep()}
                            className={cn(
                                "flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all",
                                canProceedStep()
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            Next
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
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
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    return (
        <CampaignWizardProvider>
            <WizardContent />
        </CampaignWizardProvider>
    );
}
