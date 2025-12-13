'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Layout, Link2, Rocket, Loader2, AlertCircle, Check, Sparkles, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { createCampaign } from '@/lib/db/campaigns';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

export function StepReviewLaunch() {
    const router = useRouter();
    const { currentUser } = useAuth();
    const { csvData, selectedTemplate, fieldMapping, campaignName, setCampaignName } = useCampaignWizard();

    const [isLaunching, setIsLaunching] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const canLaunch = campaignName.trim().length > 0 && currentUser;

    const handleLaunch = async () => {
        if (!canLaunch || !csvData || !selectedTemplate || !currentUser) return;

        setIsLaunching(true);

        try {
            const campaign = await createCampaign({
                template_id: selectedTemplate.id,
                name: campaignName,
                csv_data: csvData.rows,
                field_mapping: fieldMapping,
                total_pins: csvData.rowCount,
            });

            if (campaign) {
                toast.success(`Campaign "${campaignName}" created successfully!`);
                router.push(`/campaigns`);
            } else {
                toast.error('Failed to create campaign');
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
            toast.error('Failed to create campaign');
        } finally {
            setIsLaunching(false);
            setShowConfirm(false);
        }
    };

    if (!csvData || !selectedTemplate) {
        return (
            <div className="text-center py-12 text-gray-500">
                Please complete the previous steps first.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Review & Launch</h2>
                <p className="text-gray-600 mt-1">
                    Review your campaign settings and launch when ready.
                </p>
            </div>

            {/* Campaign Name Input */}
            <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6">
                <label htmlFor="campaignName" className="block text-sm font-semibold text-gray-700 mb-3">
                    Campaign Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <input
                        id="campaignName"
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="e.g., Summer Product Launch 2025"
                        className={cn(
                            "w-full px-4 py-3.5 border-2 rounded-xl text-lg font-medium focus:ring-4 outline-none transition-all",
                            campaignName.trim()
                                ? "border-green-400 focus:border-green-500 focus:ring-green-100 pr-12"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                        )}
                        maxLength={100}
                    />
                    {campaignName.trim() && (
                        <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                </div>
                {!campaignName.trim() && (
                    <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Give your campaign a memorable name
                    </p>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CSV Summary */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Data Summary</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">File:</span>
                            <span className="font-medium text-gray-900 truncate max-w-[150px]" title={csvData.fileName}>
                                {csvData.fileName}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Pins to generate:</span>
                            <span className="font-bold text-blue-600">{csvData.rowCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Columns:</span>
                            <span className="font-medium text-gray-900">{csvData.headers.length}</span>
                        </div>
                    </div>
                </div>

                {/* Template Summary */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Layout className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Template</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden">
                            {selectedTemplate.thumbnail_url ? (
                                <img
                                    src={selectedTemplate.thumbnail_url}
                                    alt={selectedTemplate.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Layout className="w-6 h-6 text-white/50" />
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
                            {selectedTemplate.category && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                    {selectedTemplate.category}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mapping Summary */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Link2 className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Field Mapping</h3>
                    </div>
                    <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                        {Object.entries(fieldMapping).map(([field, column]) => (
                            <div key={field} className="flex items-center justify-between gap-2">
                                <span className="text-gray-600 capitalize truncate">{field.replace(/_/g, ' ')}</span>
                                <span className="text-gray-400">←</span>
                                <span className="font-medium text-gray-900 truncate">{column}</span>
                            </div>
                        ))}
                        {Object.keys(fieldMapping).length === 0 && (
                            <p className="text-gray-400 italic">No fields mapped</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Launch Button - Premium Design */}
            <div className="flex flex-col items-end gap-3 pt-6">
                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!canLaunch || isLaunching}
                    className={cn(
                        "group relative flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300",
                        "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white",
                        "hover:from-green-600 hover:via-emerald-600 hover:to-teal-600",
                        "shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        (!canLaunch || isLaunching) && "opacity-50 cursor-not-allowed hover:scale-100"
                    )}
                >
                    <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
                    <span>Generate {csvData.rowCount} Pins</span>
                    <Rocket className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <p className="text-sm text-gray-500">
                    Your pins will be ready in a few moments
                </p>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Launch Campaign?</h3>
                        <p className="text-gray-600 mb-6">
                            This will create a campaign to generate <strong>{csvData.rowCount} pins</strong> using your template and data.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={isLaunching}
                                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLaunch}
                                disabled={isLaunching}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium transition-colors",
                                    "hover:bg-green-700",
                                    isLaunching && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isLaunching ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Confirm Launch
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
