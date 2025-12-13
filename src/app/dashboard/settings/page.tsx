'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { GenerationSettingsPanel } from '@/components/campaign/GenerationSettings';
import { GenerationSettings, DEFAULT_GENERATION_SETTINGS } from '@/lib/rendering/clientPinGenerator';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';

export default function SettingsPage() {
    const router = useRouter();
    const { currentUser, loading: authLoading } = useAuth();

    const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_GENERATION_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push('/login');
        }
    }, [authLoading, currentUser, router]);

    // Load user preferences
    useEffect(() => {
        const loadPreferences = async () => {
            if (!currentUser || !isSupabaseConfigured()) {
                setIsLoading(false);
                return;
            }

            try {
                const { data } = await supabase
                    .from('user_preferences')
                    .select('default_batch_size, default_quality, default_pause_enabled')
                    .eq('user_id', currentUser.id)
                    .single();

                if (data) {
                    setSettings({
                        batchSize: data.default_batch_size || DEFAULT_GENERATION_SETTINGS.batchSize,
                        quality: data.default_quality || DEFAULT_GENERATION_SETTINGS.quality,
                        pauseEnabled: data.default_pause_enabled ?? DEFAULT_GENERATION_SETTINGS.pauseEnabled,
                    });
                }
            } catch (error) {
                console.error('Error loading preferences:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPreferences();
    }, [currentUser]);

    const handleSettingsChange = (newSettings: GenerationSettings) => {
        setSettings(newSettings);
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!currentUser || !isSupabaseConfigured()) {
            toast.error('Cannot save: Not authenticated');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: currentUser.id,
                    default_batch_size: settings.batchSize,
                    default_quality: settings.quality,
                    default_pause_enabled: settings.pauseEnabled,
                    updated_at: new Date().toISOString(),
                } as Record<string, unknown>);

            if (error) {
                throw error;
            }

            toast.success('Settings saved successfully');
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving preferences:', error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading || isLoading) {
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                            <p className="text-sm text-gray-500">Default generation preferences</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${hasChanges
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : hasChanges ? (
                            <Save className="w-4 h-4" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                {/* Account Info */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
                    <div className="text-gray-600">
                        <p><span className="text-gray-400">Email:</span> {currentUser.email}</p>
                    </div>
                </div>

                {/* Generation Defaults */}
                <div className="mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Default Generation Settings</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        These settings will be applied to all new campaigns by default.
                        You can override them for individual campaigns.
                    </p>
                    <GenerationSettingsPanel
                        settings={settings}
                        onChange={handleSettingsChange}
                    />
                </div>
            </main>
        </div>
    );
}
