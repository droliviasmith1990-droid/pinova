'use client';

import React from 'react';
import { FileSpreadsheet, Palette, Link2, Rocket, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStep } from '@/lib/campaigns/CampaignWizardContext';

interface ProgressStepperProps {
    currentStep: WizardStep;
    onStepClick?: (step: WizardStep) => void;
}

const steps = [
    { number: 1, label: 'Upload CSV', icon: FileSpreadsheet },
    { number: 2, label: 'Choose Template', icon: Palette },
    { number: 3, label: 'Map Fields', icon: Link2 },
    { number: 4, label: 'Review & Launch', icon: Rocket },
] as const;

export function ProgressStepper({ currentStep, onStepClick }: ProgressStepperProps) {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = step.number === currentStep;
                    const isCompleted = step.number < currentStep;
                    const isClickable = isCompleted && onStepClick;

                    return (
                        <React.Fragment key={step.number}>
                            {/* Step Circle */}
                            <div className="flex flex-col items-center relative">
                                <button
                                    onClick={() => isClickable && onStepClick(step.number as WizardStep)}
                                    disabled={!isClickable}
                                    className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                                        isCompleted && "bg-green-500 text-white cursor-pointer hover:bg-green-600",
                                        isActive && "bg-blue-600 text-white ring-4 ring-blue-200",
                                        !isActive && !isCompleted && "bg-gray-200 text-gray-500"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </button>
                                <span
                                    className={cn(
                                        "mt-2 text-sm font-medium whitespace-nowrap",
                                        isActive && "text-blue-600",
                                        isCompleted && "text-green-600",
                                        !isActive && !isCompleted && "text-gray-500"
                                    )}
                                >
                                    {step.label}
                                </span>
                                <span
                                    className={cn(
                                        "text-xs",
                                        isActive ? "text-blue-500" : "text-gray-400"
                                    )}
                                >
                                    Step {step.number}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 mx-2 h-1 rounded-full overflow-hidden bg-gray-200">
                                    <div
                                        className={cn(
                                            "h-full bg-green-500 transition-all duration-300",
                                            step.number < currentStep ? "w-full" : "w-0"
                                        )}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
