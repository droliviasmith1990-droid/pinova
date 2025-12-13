'use client';

import React from 'react';
import { Sparkles, Type, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyCanvasStateProps {
    onAddText: () => void;
    onAddImage: () => void;
}

export function EmptyCanvasState({ onAddText, onAddImage }: EmptyCanvasStateProps) {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            {/* Gradient Background Circle */}
            <div className="relative">
                <div
                    className="absolute inset-0 -m-16 rounded-full opacity-30"
                    style={{
                        width: '300px',
                        height: '300px',
                        background: 'radial-gradient(circle, rgba(147,112,219,0.4) 0%, rgba(59,130,246,0.3) 50%, transparent 70%)',
                        transform: 'translate(-50%, -50%)',
                        left: '50%',
                        top: '50%',
                    }}
                />

                <div className="relative flex flex-col items-center text-center pointer-events-auto">
                    {/* Animated Icon */}
                    <div className="relative mb-6">
                        <div
                            className="w-[120px] h-[120px] rounded-full flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(147,112,219,0.15) 0%, rgba(59,130,246,0.15) 100%)',
                            }}
                        >
                            <Sparkles
                                className="w-14 h-14 text-purple-500 animate-pulse"
                                strokeWidth={1.5}
                            />
                        </div>
                        {/* Floating particles */}
                        <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="absolute -bottom-1 -left-3 w-2 h-2 bg-purple-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: '0.3s' }} />
                        <div className="absolute top-1/2 -right-4 w-2 h-2 bg-indigo-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: '0.5s' }} />
                    </div>

                    {/* Heading */}
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        Start Designing Your Template
                    </h2>

                    {/* Body Text */}
                    <p className="text-gray-600 max-w-[400px] mb-8 leading-relaxed">
                        Templates are reusable designs. Add elements and mark them as
                        <span className="font-medium text-purple-600"> 'dynamic' </span>
                        to replace with your CSV data.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onAddText}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200",
                                "bg-blue-600 text-white shadow-lg shadow-blue-200",
                                "hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-0.5",
                                "active:translate-y-0 active:shadow-md",
                                "min-h-[44px]"
                            )}
                        >
                            <Type className="w-5 h-5" />
                            Add Text Element
                        </button>

                        <button
                            onClick={onAddImage}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200",
                                "bg-white text-gray-700 border-2 border-gray-200",
                                "hover:border-blue-300 hover:bg-blue-50 hover:-translate-y-0.5",
                                "active:translate-y-0",
                                "min-h-[44px]"
                            )}
                        >
                            <Image className="w-5 h-5" />
                            Add Image Element
                        </button>
                    </div>

                    {/* Tutorial Link */}
                    <a
                        href="#"
                        className="mt-6 text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1 group"
                    >
                        Watch 90-second tutorial
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
