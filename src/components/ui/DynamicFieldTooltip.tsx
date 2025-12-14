'use client';

import React, { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const LOCAL_STORAGE_KEY = 'pinterest-editor-dynamic-tooltip-dismissed';
const VISIT_COUNT_KEY = 'pinterest-editor-visit-count';
const MAX_VISITS_TO_SHOW = 3;
const AUTO_DISMISS_MS = 10000;

interface DynamicFieldTooltipProps {
    children: React.ReactNode;
    targetRef?: React.RefObject<HTMLElement | null>;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export function DynamicFieldTooltip({
    children,
    position = 'bottom'
}: DynamicFieldTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Check localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (dismissed === 'true') {
            // eslint-disable-next-line
            setIsDismissed(true);
            return;
        }

        // Increment and check visit count
        const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
        if (visitCount >= MAX_VISITS_TO_SHOW) {
            setIsDismissed(true);
            return;
        }

        // Increment visit count on new session (check sessionStorage)
        const sessionKey = 'pinterest-editor-session-active';
        if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, 'true');
            localStorage.setItem(VISIT_COUNT_KEY, String(visitCount + 1));
        }
    }, []);

    // Auto-dismiss after 10 seconds if visible
    useEffect(() => {
        if (isVisible && !isDismissed) {
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, AUTO_DISMISS_MS);
            return () => clearTimeout(timer);
        }
    }, [isVisible, isDismissed]);

    // Show tooltip on hover if not dismissed
    const handleMouseEnter = () => {
        if (!isDismissed) {
            setIsHovered(true);
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        // Keep visible for a bit after mouse leaves
        setTimeout(() => {
            if (!isHovered) {
                setIsVisible(false);
            }
        }, 300);
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        setIsVisible(false);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
        }
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#2D3748]',
        bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#2D3748]',
        left: 'right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#2D3748]',
        right: 'left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#2D3748]'
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            {/* Tooltip */}
            {isVisible && !isDismissed && (
                <div
                    className={cn(
                        "absolute z-50 w-[280px] p-4 rounded-lg shadow-xl",
                        "bg-[#2D3748] text-white",
                        "animate-in fade-in-0 zoom-in-95 duration-200",
                        positionClasses[position]
                    )}
                    role="tooltip"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Arrow */}
                    <div
                        className={cn(
                            "absolute w-0 h-0 border-[6px]",
                            arrowClasses[position]
                        )}
                    />

                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Dismiss tooltip"
                    >
                        <X className="w-3 h-3 text-gray-400" />
                    </button>

                    {/* Content */}
                    <div className="pr-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-yellow-400" />
                            <span className="font-semibold text-sm">Make this Dynamic</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed mb-4">
                            When enabled, this element&apos;s content will be replaced with data from your CSV.
                            Perfect for product titles, prices, or images that change per pin.
                        </p>
                        <button
                            onClick={handleDismiss}
                            className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition-colors"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
