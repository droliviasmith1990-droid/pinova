'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
    Play, 
    Pause, 
    Clock, 
    Zap, 
    CheckCircle, 
    AlertCircle, 
    Loader2,
    Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration, formatSpeed } from '@/hooks/useProgressMetrics';

// ============================================
// Types
// ============================================
export interface EnhancedProgressTrackerProps {
    /** Number of pins completed */
    completed: number;
    /** Total pins to generate */
    total: number;
    /** Current status */
    status: 'idle' | 'generating' | 'paused' | 'completed' | 'error';
    /** Speed in pins per second */
    pinsPerSecond: number;
    /** Elapsed time in milliseconds */
    elapsedTimeMs: number;
    /** Estimated time remaining formatted */
    etaFormatted: string;
    /** Whether ETA is reliable */
    isEtaReliable: boolean;
    /** Current pin title being generated */
    currentPinTitle?: string;
    /** Current pin index */
    currentPinIndex?: number;
    /** Whether pause is enabled */
    pauseEnabled?: boolean;
    /** Is currently pausing */
    isPausing?: boolean;
    /** Callback when pause is clicked */
    onPause?: () => void;
    /** Callback when resume is clicked */
    onResume?: () => void;
    /** Number of errors */
    errorCount?: number;
}

// ============================================
// Sub-Components
// ============================================

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning';
}

function MetricCard({ icon, label, value, subValue, variant = 'default' }: MetricCardProps) {
    const variants = {
        default: 'bg-gray-50 border-gray-200',
        primary: 'bg-blue-50 border-blue-200',
        success: 'bg-green-50 border-green-200',
        warning: 'bg-amber-50 border-amber-200',
    };
    
    const iconVariants = {
        default: 'text-gray-500',
        primary: 'text-blue-500',
        success: 'text-green-500',
        warning: 'text-amber-500',
    };
    
    return (
        <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300",
            variants[variant]
        )}>
            <div className={cn("flex-shrink-0", iconVariants[variant])}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {label}
                </p>
                <p className="text-lg font-bold text-gray-900 truncate">
                    {value}
                </p>
                {subValue && (
                    <p className="text-xs text-gray-500">
                        {subValue}
                    </p>
                )}
            </div>
        </div>
    );
}

// ============================================
// Main Component
// ============================================
export function EnhancedProgressTracker({
    completed,
    total,
    status,
    pinsPerSecond,
    elapsedTimeMs,
    etaFormatted,
    isEtaReliable,
    currentPinTitle,
    currentPinIndex,
    pauseEnabled = true,
    isPausing = false,
    onPause,
    onResume,
    errorCount = 0,
}: EnhancedProgressTrackerProps) {
    // Animated percentage for smooth transitions
    const [displayPercentage, setDisplayPercentage] = useState(0);
    const animationRef = useRef<number | undefined>(undefined);
    
    const actualPercentage = total > 0 ? (completed / total) * 100 : 0;
    
    // Smooth percentage animation
    useEffect(() => {
        const animate = () => {
            setDisplayPercentage(prev => {
                const diff = actualPercentage - prev;
                if (Math.abs(diff) < 0.1) {
                    return actualPercentage;
                }
                return prev + diff * 0.15;
            });
            animationRef.current = requestAnimationFrame(animate);
        };
        
        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [actualPercentage]);
    
    // Status display configuration
    const statusConfig = {
        idle: {
            title: 'Ready to Generate',
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
            icon: <Play className="w-5 h-5" />,
        },
        generating: {
            title: 'Generating Pins...',
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            icon: <Loader2 className="w-5 h-5 animate-spin" />,
        },
        paused: {
            title: 'Generation Paused',
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
            icon: <Pause className="w-5 h-5" />,
        },
        completed: {
            title: 'Generation Complete',
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            icon: <CheckCircle className="w-5 h-5" />,
        },
        error: {
            title: 'Generation Error',
            color: 'text-red-600',
            bgColor: 'bg-red-100',
            icon: <AlertCircle className="w-5 h-5" />,
        },
    };
    
    const currentStatus = statusConfig[status];
    const isActive = status === 'generating';
    
    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        currentStatus.bgColor
                    )}>
                        <span className={currentStatus.color}>
                            {currentStatus.icon}
                        </span>
                    </div>
                    <div>
                        <h3 className={cn(
                            "font-semibold",
                            currentStatus.color
                        )}>
                            {currentStatus.title}
                        </h3>
                        {currentPinTitle && isActive && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                                Pin #{currentPinIndex}: {currentPinTitle}
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Pause/Resume Button */}
                {pauseEnabled && (status === 'generating' || status === 'paused') && (
                    <button
                        onClick={status === 'paused' ? onResume : onPause}
                        disabled={isPausing}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                            status === 'paused'
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200",
                            isPausing && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isPausing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Pausing...
                            </>
                        ) : status === 'paused' ? (
                            <>
                                <Play className="w-4 h-4" />
                                Resume
                            </>
                        ) : (
                            <>
                                <Pause className="w-4 h-4" />
                                Pause
                            </>
                        )}
                    </button>
                )}
            </div>
            
            {/* Large Percentage Display */}
            <div className="px-6 py-6 flex items-center justify-center">
                <div className={cn(
                    "relative w-32 h-32 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-gray-50 to-gray-100",
                    "shadow-inner"
                )}>
                    {/* Circular progress ring */}
                    <svg 
                        className="absolute inset-0 w-full h-full -rotate-90"
                        viewBox="0 0 100 100"
                    >
                        {/* Background circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={status === 'completed' ? '#22c55e' : status === 'error' ? '#ef4444' : '#3b82f6'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - displayPercentage / 100)}`}
                            className="transition-all duration-300"
                        />
                    </svg>
                    
                    {/* Percentage text */}
                    <div className="text-center z-10">
                        <span className={cn(
                            "text-3xl font-bold",
                            status === 'completed' ? 'text-green-600' :
                            status === 'error' ? 'text-red-600' :
                            'text-gray-900'
                        )}>
                            {displayPercentage.toFixed(1)}%
                        </span>
                    </div>
                    
                    {/* Pulse animation when generating */}
                    {isActive && (
                        <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
                    )}
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="px-6 pb-4">
                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-full",
                            status === 'completed' 
                                ? "bg-gradient-to-r from-green-400 to-emerald-500" 
                                : status === 'error'
                                    ? "bg-gradient-to-r from-red-400 to-red-500"
                                    : "bg-gradient-to-r from-blue-400 to-indigo-500"
                        )}
                        style={{ width: `${displayPercentage}%` }}
                    />
                    {/* Shimmer effect when generating */}
                    {isActive && (
                        <div 
                            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                            style={{ 
                                animation: 'shimmer 2s infinite',
                            }}
                        />
                    )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{completed.toLocaleString()} completed</span>
                    <span>{total.toLocaleString()} total</span>
                </div>
            </div>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 px-6 pb-4">
                <MetricCard
                    icon={<CheckCircle className="w-5 h-5" />}
                    label="Completed"
                    value={`${completed.toLocaleString()} / ${total.toLocaleString()}`}
                    variant={status === 'completed' ? 'success' : 'default'}
                />
                <MetricCard
                    icon={<Zap className="w-5 h-5" />}
                    label="Speed"
                    value={formatSpeed(pinsPerSecond)}
                    variant={isActive ? 'primary' : 'default'}
                />
                <MetricCard
                    icon={<Clock className="w-5 h-5" />}
                    label="Elapsed"
                    value={formatDuration(elapsedTimeMs)}
                    variant="default"
                />
            </div>
            
            {/* ETA Display - Prominent */}
            {(isActive || status === 'paused') && (
                <div className="mx-6 mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Timer className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-800">
                                Time Remaining
                            </p>
                            <p className="text-xl font-bold text-blue-900">
                                {isEtaReliable ? etaFormatted : 'Calculating...'}
                            </p>
                            {!isEtaReliable && completed > 0 && (
                                <p className="text-xs text-blue-600">
                                    Need {5 - completed} more pins for accurate estimate
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Error Summary */}
            {errorCount > 0 && (
                <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            {errorCount} pin{errorCount > 1 ? 's' : ''} failed to generate
                        </span>
                    </div>
                </div>
            )}
            
            {/* Add shimmer animation styles */}
            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                }
            `}</style>
        </div>
    );
}
