'use client';

import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { PropertiesPanel } from '@/components/panels/PropertiesPanel';
import { LayersPanel } from '@/components/panels/LayersPanel';

export function RightPanel() {
    const activeTab = useEditorStore((s) => s.activeTab);
    const setActiveTab = useEditorStore((s) => s.setActiveTab);

    return (
        <aside className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
            {/* Tab Bar */}
            <div className="h-12 flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('properties')}
                    className={cn(
                        "flex-1 text-sm font-medium transition-colors border-b-2",
                        activeTab === 'properties'
                            ? "text-blue-600 border-blue-600 bg-blue-50/50"
                            : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
                    )}
                >
                    Properties
                </button>
                <button
                    onClick={() => setActiveTab('layers')}
                    className={cn(
                        "flex-1 text-sm font-medium transition-colors border-b-2",
                        activeTab === 'layers'
                            ? "text-blue-600 border-blue-600 bg-blue-50/50"
                            : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
                    )}
                >
                    Layers
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'properties' ? <PropertiesPanel /> : <LayersPanel />}
            </div>
        </aside>
    );
}
