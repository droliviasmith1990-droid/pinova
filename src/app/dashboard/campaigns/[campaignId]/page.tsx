'use client';

// Debug logging - only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => DEBUG && console.log(...args);

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { getCampaign, updateCampaign, CampaignWithDetails } from '@/lib/db/campaigns';
import { getTemplate } from '@/lib/db/templates';
import { GenerationController, GenerationSettings, GenerationProgress, DEFAULT_GENERATION_SETTINGS } from '@/components/campaign/GenerationController';
import { GenerationSettingsPanel } from '@/components/campaign/GenerationSettings';
import { PinsGrid, PinCardData } from '@/components/campaign/PinCard';
import { ExportToolbar } from '@/components/campaign/ExportToolbar';
import { CampaignDetailsPanel } from '@/components/campaign/CampaignDetailsPanel';
import { SelectionActionBar, DeleteConfirmationModal } from '@/components/ui/BulkActions';
import { Element, CanvasSize } from '@/types/editor';
import { toast } from 'sonner';

export default function CampaignDetailPage() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.campaignId as string;
    const { currentUser, loading: authLoading } = useAuth();

    const [campaign, setCampaign] = useState<CampaignWithDetails | null>(null);
    const [templateData, setTemplateData] = useState<{
        name: string;
        thumbnail_url?: string | null;
        canvas_size?: { width: number; height: number };
    } | null>(null);
    const [template, setTemplate] = useState<{
        elements: Element[];
        canvas_size: CanvasSize;
        background_color: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [generatedPins, setGeneratedPins] = useState<PinCardData[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_GENERATION_SETTINGS);
    const [previewPin, setPreviewPin] = useState<PinCardData | null>(null);

    // Bulk selection state
    const [selectedPinIds, setSelectedPinIds] = useState<Set<string>>(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
    const [pinToDelete, setPinToDelete] = useState<PinCardData | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push('/login');
        }
    }, [authLoading, currentUser, router]);

    // Load campaign and template
    useEffect(() => {
        const loadData = async () => {
            if (!campaignId) return;

            setIsLoading(true);
            try {
                // Load campaign
                const campaignData = await getCampaign(campaignId);
                if (!campaignData) {
                    toast.error('Campaign not found');
                    router.push('/dashboard/campaigns');
                    return;
                }
                setCampaign(campaignData);

                // Load campaign settings if they exist
                if (campaignData.generation_settings) {
                    const savedSettings = campaignData.generation_settings as unknown as GenerationSettings;
                    if (savedSettings.batchSize && savedSettings.quality && savedSettings.pauseEnabled !== undefined) {
                        setSettings(savedSettings);
                    }
                }

                // Load template
                const fetchedTemplate = await getTemplate(campaignData.template_id);
                if (fetchedTemplate) {
                    setTemplateData(fetchedTemplate);
                    setTemplate({
                        elements: fetchedTemplate.elements as Element[],
                        canvas_size: fetchedTemplate.canvas_size as CanvasSize,
                        background_color: fetchedTemplate.background_color || '#ffffff',
                    });
                }

                // Load existing generated pins
                await loadGeneratedPins();
            } catch (error) {
                console.error('Error loading campaign:', error);
                toast.error('Failed to load campaign');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [campaignId, router]);

    // Function to load generated pins
    const loadGeneratedPins = useCallback(async () => {
        if (!campaignId) return;

        try {
            log('Loading generated pins for campaign:', campaignId);
            const pinsResponse = await fetch(`/api/generated-pins?campaign_id=${campaignId}`);
            const pinsResult = await pinsResponse.json();

            log('Pins API response:', pinsResult);

            if (pinsResult.data && Array.isArray(pinsResult.data)) {
                const mappedPins: PinCardData[] = pinsResult.data
                    .filter((pin: Record<string, unknown>) => pin.image_url) // Only include pins with valid image URL
                    .map((pin: Record<string, unknown>, index: number) => ({
                        id: (pin.id as string) || `pin-${index}`,
                        rowIndex: index,
                        imageUrl: pin.image_url as string,
                        status: (pin.status as 'completed' | 'failed' | 'pending') || 'completed',
                        errorMessage: pin.error_message as string | undefined,
                        csvData: pin.data_row as Record<string, string>,
                    }));

                log('Mapped pins:', mappedPins.length, 'pins');
                setGeneratedPins(mappedPins);
            } else {
                log('No pins data found');
            }
        } catch (error) {
            console.error('Error loading generated pins:', error);
        }
    }, [campaignId]);

    // Reload pins when campaign status changes to completed
    useEffect(() => {
        if (campaign?.status === 'completed' && generatedPins.length === 0) {
            log('Campaign completed but no pins - reloading...');
            loadGeneratedPins();
        }
    }, [campaign?.status, generatedPins.length, loadGeneratedPins]);

    // Handle pin generated
    const handlePinGenerated = useCallback((pin: PinCardData) => {
        setGeneratedPins((prev) => {
            const existing = prev.findIndex((p) => p.rowIndex === pin.rowIndex);
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = pin;
                return updated;
            }
            return [...prev, pin].sort((a, b) => a.rowIndex - b.rowIndex);
        });
    }, []);

    // Handle progress update
    const handleProgressUpdate = useCallback(async (progress: GenerationProgress) => {
        if (campaign && progress.current % 5 === 0) {
            // Update campaign progress every 5 pins
            await updateCampaign(campaign.id, {
                generated_pins: progress.current,
                current_index: progress.current,
            });
        }
    }, [campaign]);

    // Handle status change
    const handleStatusChange = useCallback(async (status: string) => {
        if (campaign) {
            log('[CampaignPage] Updating status to:', status, 'for campaign:', campaign.id);
            const updateData: Record<string, unknown> = { status };
            if (status === 'paused') {
                updateData.paused_at = new Date().toISOString();
            } else if (status === 'completed') {
                updateData.completed_at = new Date().toISOString();
            }
            const success = await updateCampaign(campaign.id, updateData);
            log('[CampaignPage] Update result:', success);
            if (success) {
                setCampaign((prev) => prev ? { ...prev, status: status as 'pending' | 'processing' | 'paused' | 'completed' | 'failed' } : null);
            }
        }
    }, [campaign]);

    // Handle pin preview
    const handlePreview = useCallback((pin: PinCardData) => {
        setPreviewPin(pin);
    }, []);

    // Handle pin selection
    const handleSelectPin = useCallback((pinId: string, selected: boolean) => {
        setSelectedPinIds(prev => {
            const next = new Set(prev);
            if (selected) {
                next.add(pinId);
            } else {
                next.delete(pinId);
            }
            return next;
        });
    }, []);

    // Select all pins
    const handleSelectAll = useCallback(() => {
        setSelectedPinIds(new Set(generatedPins.map(p => p.id)));
    }, [generatedPins]);

    // Deselect all pins
    const handleDeselectAll = useCallback(() => {
        setSelectedPinIds(new Set());
    }, []);

    // Delete single pin
    const handleDeletePin = useCallback((pin: PinCardData) => {
        setPinToDelete(pin);
        setShowDeleteModal(true);
    }, []);

    // Handle bulk delete
    const handleDeleteSelected = useCallback(() => {
        if (selectedPinIds.size > 0) {
            setPinToDelete(null);
            setShowDeleteModal(true);
        }
    }, [selectedPinIds]);

    // Confirm delete
    const handleConfirmDelete = useCallback(async () => {
        const idsToDelete = pinToDelete ? [pinToDelete.id] : Array.from(selectedPinIds);
        if (idsToDelete.length === 0) return;

        setIsDeleting(true);
        setDeleteProgress({ current: 0, total: idsToDelete.length });

        let successCount = 0;
        const failedIds: string[] = [];

        try {
            for (let i = 0; i < idsToDelete.length; i++) {
                const pinId = idsToDelete[i];
                try {
                    const response = await fetch(`/api/generated-pins/${pinId}`, { method: 'DELETE' });
                    const data = await response.json();

                    if (response.ok && data.success) {
                        successCount++;
                        log(`[delete] Pin ${pinId} deleted successfully`);
                    } else {
                        console.error(`[delete] Failed to delete pin ${pinId}:`, data.error);
                        failedIds.push(pinId);
                    }
                } catch (fetchError) {
                    console.error(`[delete] Fetch error for pin ${pinId}:`, fetchError);
                    failedIds.push(pinId);
                }
                setDeleteProgress({ current: i + 1, total: idsToDelete.length });
            }

            // Only remove successfully deleted pins from state
            if (successCount > 0) {
                const successfulIds = idsToDelete.filter(id => !failedIds.includes(id));
                setGeneratedPins(prev => prev.filter(p => !successfulIds.includes(p.id)));
                setSelectedPinIds(new Set());
                toast.success(`${successCount} pin${successCount > 1 ? 's' : ''} deleted successfully`);

                // Reload pins from database to ensure sync
                await loadGeneratedPins();
            }

            if (failedIds.length > 0) {
                toast.error(`Failed to delete ${failedIds.length} pin${failedIds.length > 1 ? 's' : ''}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete pins');
            // Reload pins from database on error to restore correct state
            await loadGeneratedPins();
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setPinToDelete(null);
        }
    }, [pinToDelete, selectedPinIds, loadGeneratedPins]);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!campaign || !template) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Campaign not found</p>
            </div>
        );
    }

    const csvData = (campaign.csv_data || []) as Record<string, string>[];
    const fieldMapping = (campaign.field_mapping || {}) as Record<string, string>;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/campaigns"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
                            <p className="text-sm text-gray-500">
                                {csvData.length} pins • {campaign.status}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                            showSettings
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Info & Settings */}
                    <div className="space-y-6">
                        {/* Campaign Details Panel */}
                        <CampaignDetailsPanel
                            campaignName={campaign.name}
                            templateName={templateData?.name}
                            templateThumbnail={templateData?.thumbnail_url || undefined}
                            canvasWidth={template?.canvas_size.width}
                            canvasHeight={template?.canvas_size.height}
                            templateId={campaign.template_id}
                            csvRowCount={csvData.length}
                            createdAt={campaign.created_at}
                            status={campaign.status}
                            generatedCount={generatedPins.length}
                        />

                        {/* Settings Panel */}
                        {showSettings && (
                            <GenerationSettingsPanel
                                settings={settings}
                                onChange={setSettings}
                                disabled={campaign.status === 'processing'}
                            />
                        )}
                    </div>

                    {/* Right Column: Generation & Pins */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Generation Controller */}
                        <GenerationController
                            campaignId={campaign.id}
                            userId={currentUser?.id || ''}
                            campaignName={campaign.name}
                            templateElements={template.elements}
                            canvasSize={template.canvas_size}
                            backgroundColor={template.background_color}
                            csvData={csvData}
                            fieldMapping={fieldMapping}
                            initialSettings={settings}
                            initialProgress={campaign.current_index || 0}
                            initialStatus={campaign.status}
                            generatedCount={generatedPins.length}
                            onPinGenerated={handlePinGenerated}
                            onProgressUpdate={handleProgressUpdate}
                            onStatusChange={handleStatusChange}
                        />

                        {/* Export Toolbar */}
                        {generatedPins.length > 0 && (
                            <ExportToolbar
                                pins={generatedPins}
                                campaignName={campaign.name}
                                csvData={csvData}
                            />
                        )}

                        {/* Pins Grid */}
                        {generatedPins.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">
                                        Generated Pins ({generatedPins.length})
                                    </h3>
                                    {selectedPinIds.size > 0 && (
                                        <span className="text-sm text-blue-600 font-medium">
                                            {selectedPinIds.size} selected
                                        </span>
                                    )}
                                </div>
                                <PinsGrid
                                    pins={generatedPins}
                                    selectedIds={selectedPinIds}
                                    onSelectPin={handleSelectPin}
                                    showSelection={selectedPinIds.size > 0}
                                    onPreview={handlePreview}
                                    onDeletePin={handleDeletePin}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Bulk Selection Action Bar */}
            <SelectionActionBar
                selectedCount={selectedPinIds.size}
                totalCount={generatedPins.length}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onDeleteSelected={handleDeleteSelected}
                isDeleting={isDeleting}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setPinToDelete(null); }}
                onConfirm={handleConfirmDelete}
                count={pinToDelete ? 1 : selectedPinIds.size}
                previewImages={
                    pinToDelete
                        ? [pinToDelete.imageUrl]
                        : generatedPins.filter(p => selectedPinIds.has(p.id)).map(p => p.imageUrl)
                }
                isDeleting={isDeleting}
                deleteProgress={deleteProgress}
            />

            {/* Preview Modal */}
            {previewPin && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                    onClick={() => setPreviewPin(null)}
                >
                    <img
                        src={previewPin.imageUrl}
                        alt={`Pin ${previewPin.rowIndex + 1}`}
                        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
