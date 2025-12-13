'use client';

import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import Link from 'next/link';

interface DesktopOnlyMessageProps {
    featureName?: string;
}

export function DesktopOnlyMessage({ featureName = 'Template Editor' }: DesktopOnlyMessageProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6 md:hidden">
            <div className="max-w-sm w-full text-center">
                {/* Icon */}
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
                        <Monitor className="w-12 h-12 text-white" />
                    </div>
                    {/* Mobile crossed out */}
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-100">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-0.5 bg-red-500 rotate-45 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                    Desktop Required
                </h1>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    The <span className="font-semibold text-blue-600">{featureName}</span> requires a larger screen for the best experience.
                    Please open this page on a desktop or laptop computer.
                </p>

                {/* Screen size hint */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700">
                    <Monitor className="w-4 h-4" />
                    <span>Minimum 768px screen width</span>
                </div>

                {/* Alternative actions */}
                <div className="mt-8 space-y-3">
                    <Link
                        href="/dashboard/campaigns"
                        className="block w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                        View Campaigns (Mobile-Friendly)
                    </Link>
                    <Link
                        href="/dashboard"
                        className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}

// Hook to detect mobile
export function useIsMobile(breakpoint: number = 768): boolean {
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [breakpoint]);

    return isMobile;
}
