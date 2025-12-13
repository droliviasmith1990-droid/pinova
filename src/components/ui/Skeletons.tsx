'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Generic Skeleton Component
// ============================================
interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

export function Skeleton({ className, variant = 'rectangular', width, height }: SkeletonProps) {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={cn(
                "animate-pulse bg-gray-200",
                variant === 'circular' && "rounded-full",
                variant === 'text' && "rounded h-4",
                variant === 'rectangular' && "rounded-lg",
                className
            )}
            style={style}
        />
    );
}

// ============================================
// Campaign Card Skeleton
// ============================================
export function CampaignCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton variant="circular" width={32} height={32} />
            </div>

            {/* Template & Status */}
            <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton className="h-4 w-32" />
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
                <Skeleton className="h-9 w-20 rounded-lg" />
                <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
        </div>
    );
}

// ============================================
// Campaigns List Skeleton
// ============================================
export function CampaignsListSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <CampaignCardSkeleton key={i} />
            ))}
        </div>
    );
}

// ============================================
// Pin Card Skeleton
// ============================================
export function PinCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-pulse">
            {/* Image placeholder */}
            <div className="aspect-[2/3] bg-gray-200" />

            {/* Title */}
            <div className="px-3 py-2.5 border-b border-gray-100">
                <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-2 p-2">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="w-10 h-10 rounded-lg" />
            </div>
        </div>
    );
}

// ============================================
// Pins Grid Skeleton
// ============================================
export function PinsGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <PinCardSkeleton key={i} />
            ))}
        </div>
    );
}

// ============================================
// Campaign Details Panel Skeleton
// ============================================
export function CampaignDetailsPanelSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-4">
                <Skeleton className="h-5 w-40 bg-gray-700" />
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
                {/* Campaign Name */}
                <div>
                    <Skeleton className="h-3 w-24 mb-2" />
                    <Skeleton className="h-5 w-48" />
                </div>

                {/* Template */}
                <div>
                    <Skeleton className="h-3 w-20 mb-2" />
                    <div className="flex items-start gap-3">
                        <Skeleton className="w-14 h-14 rounded-lg" />
                        <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                </div>

                {/* Data Source */}
                <div>
                    <Skeleton className="h-3 w-24 mb-2" />
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                        <Skeleton className="w-9 h-9 rounded-lg" />
                        <div>
                            <Skeleton className="h-4 w-20 mb-1" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div>
                    <Skeleton className="h-3 w-20 mb-2" />
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                        <Skeleton className="w-9 h-9 rounded-lg" />
                        <div className="flex-1">
                            <Skeleton className="h-4 w-28 mb-2" />
                            <Skeleton className="h-1.5 w-full rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-7 w-24 rounded-full" />
                </div>
            </div>
        </div>
    );
}

// ============================================
// Generation Controller Skeleton
// ============================================
export function GenerationControllerSkeleton() {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton variant="circular" width={24} height={24} />
            </div>

            {/* Progress Bar */}
            <Skeleton className="h-3 w-full rounded-full" />

            {/* Buttons */}
            <div className="flex gap-3">
                <Skeleton className="h-12 w-40 rounded-lg" />
                <Skeleton className="h-12 w-32 rounded-lg" />
            </div>
        </div>
    );
}

// ============================================
// Full Page Loading Skeleton
// ============================================
export function PageLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Loading...</p>
            </div>
        </div>
    );
}
