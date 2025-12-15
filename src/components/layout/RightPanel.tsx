'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { PropertiesPanel } from '@/components/panels/PropertiesPanel';
import { ArrangePanel } from '@/components/panels/ArrangePanel';
import { LayersPanel } from '@/components/panels/LayersPanel';
import { Settings } from 'lucide-react';

type TabType = 'properties' | 'arrange' | 'layers';

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
                    "w-96 bg-white border-l border-gray-200 flex flex-col h-full transition-transform duration-300 ease-in-out",
                    "lg:relative lg:translate-x-0 fixed z-40 right-0",
                    isPanelOpen ? "translate-x-0" : "translate-x-full"
                )}
                aria-label="Editor sidebar"
            >
                {/* Tab Bar */}
                <div className="h-12 flex border-b border-gray-200" role="tablist" aria-label="Editor panels">
                    <button
                        onClick={() => setActiveTab('properties')}
                        role="tab"
                        aria-selected={activeTab === 'properties'}
                        aria-controls="properties-panel"
                        className={cn(
                            "flex-1 text-sm font-medium transition-all duration-150 border-b-2",
                            activeTab === 'properties'
                                ? "text-blue-600 border-blue-600 bg-blue-50/50"
                                : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
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
                            "flex-1 text-sm font-medium transition-all duration-150 border-b-2",
                            activeTab === 'arrange'
                                ? "text-blue-600 border-blue-600 bg-blue-50/50"
                                : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
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
                            "flex-1 text-sm font-medium transition-all duration-150 border-b-2",
                            activeTab === 'layers'
                                ? "text-blue-600 border-blue-600 bg-blue-50/50"
                                : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        Layers
                    </button>
                </div>

                {/* Tab Content */}
                <div
                    className="flex-1 overflow-y-auto p-4"
                    role="tabpanel"
                    id={`${activeTab}-panel`}
                    aria-labelledby={`${activeTab}-tab`}
                >
                    {activeTab === 'properties' && <PropertiesPanel />}
                    {activeTab === 'arrange' && <ArrangePanel />}
                    {activeTab === 'layers' && <LayersPanel />}
                </div>
            </aside>
        </>
    );
}

