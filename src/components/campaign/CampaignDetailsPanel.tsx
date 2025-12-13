'use client';

import React from 'react';
import { FileSpreadsheet, Layout, Calendar, CheckCircle, Clock, Loader2, XCircle, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignDetailsPanelProps {
    campaignName: string;
    templateName?: string;
    templateThumbnail?: string;
    canvasWidth?: number;
    canvasHeight?: number;
    templateId: string;
    csvRowCount: number;
    createdAt: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
    generatedCount: number;
}

const statusConfig: Record<string, {
    icon: typeof Clock;
    label: string;
    bgColor: string;
    textColor: string;
    dotColor: string;
    animate?: boolean;
}> = {
    pending: {
        icon: Clock,
        label: 'Pending',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        dotColor: 'bg-gray-500',
    },
    processing: {
        icon: Loader2,
        label: 'Processing',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        dotColor: 'bg-blue-500',
        animate: true,
    },
    paused: {
        icon: Clock,
        label: 'Paused',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        dotColor: 'bg-amber-500',
    },
    completed: {
        icon: CheckCircle,
        label: 'Completed',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        dotColor: 'bg-green-500',
    },
    failed: {
        icon: XCircle,
        label: 'Failed',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        dotColor: 'bg-red-500',
    },
};

export function CampaignDetailsPanel({
    campaignName,
    templateName,
    templateThumbnail,
    canvasWidth,
    canvasHeight,
    templateId,
    csvRowCount,
    createdAt,
    status,
    generatedCount,
}: CampaignDetailsPanelProps) {
    const statusInfo = statusConfig[status];
    const StatusIcon = statusInfo.icon;

    // Format date nicely
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-4">
                <h3 className="text-white font-semibold">Campaign Details</h3>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
                {/* Campaign Name */}
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Campaign Name</p>
                    <p className="text-base font-semibold text-gray-900">{campaignName || 'Untitled Campaign'}</p>
                </div>

                {/* Template Info */}
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Template</p>
                    <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {templateThumbnail ? (
                                <img
                                    src={templateThumbnail}
                                    alt="Template preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Layout className="w-6 h-6 text-gray-400" />
                            )}
                        </div>
                        {/* Template Details */}
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{templateName || 'Template'}</p>
                            {canvasWidth && canvasHeight && (
                                <p className="text-sm text-gray-500 mt-0.5">{canvasWidth} × {canvasHeight} px</p>
                            )}
                            <p className="text-xs text-gray-400 font-mono mt-1 truncate" title={templateId}>
                                {templateId.slice(0, 8)}...
                            </p>
                        </div>
                    </div>
                </div>

                {/* Data Source */}
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Data Source</p>
                    <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-medium text-blue-900">CSV File</p>
                            <p className="text-sm text-blue-700">{csvRowCount} rows</p>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Progress</p>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900">{generatedCount} of {csvRowCount} pins</p>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-300",
                                        status === 'completed' ? "bg-green-500" : "bg-blue-500"
                                    )}
                                    style={{ width: `${Math.round((generatedCount / csvRowCount) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Created Date */}
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Created</p>
                    <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-sm">{formatDate(createdAt)}</p>
                    </div>
                </div>

                {/* Status */}
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Status</p>
                    <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
                        statusInfo.bgColor
                    )}>
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            statusInfo.dotColor,
                            statusInfo.animate && "animate-pulse"
                        )} />
                        <StatusIcon className={cn(
                            "w-4 h-4",
                            statusInfo.textColor,
                            statusInfo.animate && "animate-spin"
                        )} />
                        <span className={cn("text-sm font-medium", statusInfo.textColor)}>
                            {statusInfo.label}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
