'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { PropertiesPanel } from '@/components/panels/PropertiesPanel';
import { ArrangePanel } from '@/components/panels/ArrangePanel';
import { LayersPanel } from '@/components/panels/LayersPanel';
import { TemplateMetadataPanel } from '@/components/panels/TemplateMetadataPanel';
import { Settings } from 'lucide-react';

type TabType = 'properties' | 'arrange' | 'layers' | 'details';

export function RightPanel() {
    const [activeTab, setActiveTab] = useState<TabType>('properties');
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    return (
        <>
            {/* Toggle Button for Mobile/Tablet */}
            <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="lg:hidden fixed top-16 right-2 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-label="Toggle properties panel"
            >
                <Settings className="w-5 h-5 text-gray-700" />
            </button>

            {/* Overlay for Mobile */}
            {isPanelOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
                    onClick={() => setIsPanelOpen(false)}
                />
            )}

            {/* Panel */}
            <aside
                className={cn(
                    "w-96 bg-white/90 backdrop-blur-xl border-l border-white/40 flex flex-col h-full transition-transform duration-300 ease-in-out shadow-creative-lg z-30",
                    "lg:relative lg:translate-x-0 fixed z-40 right-0",
                    isPanelOpen ? "translate-x-0" : "translate-x-full"
                )}
                aria-label="Editor sidebar"
            >
                {/* Tab Bar */}
                <div className="h-14 flex items-center px-4 gap-2 border-b border-gray-100/50 bg-white/50 backdrop-blur-sm" role="tablist" aria-label="Editor panels">
                    <button
                        onClick={() => setActiveTab('properties')}
                        role="tab"
                        aria-selected={activeTab === 'properties'}
                        aria-controls="properties-panel"
                        className={cn(
                            "flex-1 py-2 text-xs font-semibold transition-all duration-200 rounded-lg",
                            activeTab === 'properties'
                                ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-100"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                        )}
                    >
                        Properties
                    </button>
                    <button
                        onClick={() => setActiveTab('arrange')}
                        role="tab"
                        aria-selected={activeTab === 'arrange'}
                        aria-controls="arrange-panel"
                        className={cn(
                            "flex-1 py-2 text-xs font-semibold transition-all duration-200 rounded-lg",
                            activeTab === 'arrange'
                                ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-100"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                        )}
                    >
                        Arrange
                    </button>
                    <button
                        onClick={() => setActiveTab('layers')}
                        role="tab"
                        aria-selected={activeTab === 'layers'}
                        aria-controls="layers-panel"
                        className={cn(
                            "flex-1 py-2 text-xs font-semibold transition-all duration-200 rounded-lg",
                            activeTab === 'layers'
                                ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-100"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                        )}
                    >
                        Layers
                    </button>
                    <button
                        onClick={() => setActiveTab('details')}
                        role="tab"
                        aria-selected={activeTab === 'details'}
                        aria-controls="details-panel"
                        className={cn(
                            "flex-1 py-2 text-xs font-semibold transition-all duration-200 rounded-lg",
                            activeTab === 'details'
                                ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-100"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                        )}
                    >
                        Details
                    </button>
                </div>

                {/* Tab Content */}
                <div
                    className="flex-1 overflow-y-auto"
                    role="tabpanel"
                    id={`${activeTab}-panel`}
                    aria-labelledby={`${activeTab}-tab`}
                >
                    {activeTab === 'properties' && <div className="p-4"><PropertiesPanel /></div>}
                    {activeTab === 'arrange' && <div className="p-4"><ArrangePanel /></div>}
                    {activeTab === 'layers' && <div className="p-4"><LayersPanel /></div>}
                    {activeTab === 'details' && <TemplateMetadataPanel />}
                </div>
            </aside>
        </>
    );
}

