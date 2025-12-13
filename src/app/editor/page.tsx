'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { Toolbar } from '@/components/layout/Toolbar';
import { CanvasArea } from '@/components/layout/CanvasArea';
import { RightPanel } from '@/components/layout/RightPanel';
import { FontLibraryPanel } from '@/components/panels/FontLibraryPanel';
import { KeyboardShortcutsModal, useKeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { DesktopOnlyMessage, useIsMobile } from '@/components/ui/DesktopOnlyMessage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/lib/auth/AuthContext';
import { Loader2 } from 'lucide-react';

export default function EditorPage() {
    const router = useRouter();
    const { currentUser, loading } = useAuth();
    const isMobile = useIsMobile();

    // Initialize keyboard shortcuts
    useKeyboardShortcuts();

    // Keyboard shortcuts modal
    const { isOpen: isShortcutsOpen, close: closeShortcuts } = useKeyboardShortcutsModal();

    const [isFontLibraryOpen, setFontLibraryOpen] = useState(false);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !currentUser) {
            router.push('/login');
        }
    }, [loading, currentUser, router]);

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Don't render editor if not authenticated (will redirect)
    if (!currentUser) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Show mobile message on small screens
    if (isMobile) {
        return <DesktopOnlyMessage featureName="Template Editor" />;
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
            {/* Header */}
            <Header />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <div className="relative">
                    <LeftSidebar />
                    {/* Font Library Panel - slides over left sidebar */}
                    <FontLibraryPanel
                        isOpen={isFontLibraryOpen}
                        onClose={() => setFontLibraryOpen(false)}
                    />
                </div>

                {/* Center Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar with font library toggle */}
                    <Toolbar onOpenFontLibrary={() => setFontLibraryOpen(true)} />

                    {/* Canvas */}
                    <CanvasArea />
                </div>

                {/* Right Panel */}
                <RightPanel />
            </div>

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={closeShortcuts} />
        </div>
    );
}
