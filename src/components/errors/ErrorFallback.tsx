'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

/**
 * Generic error fallback for top-level errors
 */
export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Something went wrong
                </h1>

                <p className="text-gray-600 mb-6">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                </p>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={resetErrorBoundary}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>

                    <a
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Go Home
                    </a>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <details className="mt-6 text-left">
                        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                            Technical Details
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-600 overflow-auto max-h-40">
                            {error.stack}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    );
}

/**
 * Canvas-specific error fallback
 */
export function CanvasErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />

                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Canvas Error
                </h2>

                <p className="text-sm text-gray-600 mb-4">
                    The canvas failed to render. Your work has been saved.
                </p>

                <button
                    onClick={resetErrorBoundary}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                    Reload Canvas
                </button>
            </div>
        </div>
    );
}

/**
 * Panel-specific error fallback (sidebar, right panel)
 */
export function PanelErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4">
            <AlertTriangle className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-3 text-center">
                Panel failed to load
            </p>
            <button
                onClick={resetErrorBoundary}
                className="text-xs text-blue-600 hover:text-blue-700"
            >
                Retry
            </button>
        </div>
    );
}
