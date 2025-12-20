import React from 'react';
import {
    Undo2,
    Redo2,
    Minus,
    Plus,
    Maximize,
    ChevronDown,
    Magnet
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function FloatingToolbar() {
    const undo = useEditorStore((s) => s.undo);
    const redo = useEditorStore((s) => s.redo);
    const canUndo = useEditorStore((s) => s.canUndo());
    const canRedo = useEditorStore((s) => s.canRedo());
    
    // Zoom
    const zoom = useEditorStore((s) => s.zoom);
    const setZoom = useEditorStore((s) => s.setZoom);
    const canvasSize = useEditorStore((s) => s.canvasSize);

    // Snapping
    const magneticSnapping = useSnappingSettingsStore((s) => s.magneticSnapping);
    const setMagneticSnapping = useSnappingSettingsStore((s) => s.setMagneticSnapping);

    const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 3));
    const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.1));
    
    const handleFit = () => {
         // Simple fit logic, can be refined based on viewport
         setZoom(0.5); 
    };

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 h-11 bg-white/90 backdrop-blur-md rounded-full shadow-creative-lg border border-white/40 flex items-center px-2 gap-1.5 z-50 transition-all duration-300 hover:shadow-creative-xl hover:scale-[1.01]">
            {/* Undo / Redo */}
            <div className="flex items-center gap-1 pr-2.5 border-r border-gray-200/60">
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100/80 rounded-full disabled:opacity-40 disabled:hover:bg-transparent transition-colors group"
                >
                    <Undo2 className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    <span className="opacity-0 w-0 group-hover:w-auto group-hover:opacity-100 overflow-hidden transition-all duration-300">Undo</span>
                </button>
                <button
                    onClick={redo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Shift+Z)"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100/80 rounded-full disabled:opacity-40 disabled:hover:bg-transparent transition-colors group"
                >
                    <Redo2 className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    <span className="opacity-0 w-0 group-hover:w-auto group-hover:opacity-100 overflow-hidden transition-all duration-300">Redo</span>
                </button>
            </div>

            {/* Snapping */}
            <div className="flex items-center px-1.5 border-r border-gray-200/60 h-6 gap-1">
                 <button
                    onClick={() => setMagneticSnapping(!magneticSnapping)}
                    className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
                         magneticSnapping 
                            ? "bg-linear-to-br from-pink-50 to-pink-100 text-pink-600 shadow-sm ring-1 ring-pink-200" 
                            : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-700"
                    )}
                    title="Magnetic Snapping"
                 >
                    <Magnet className={cn("w-4 h-4 transition-transform", magneticSnapping ? "scale-110" : "")} />
                </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 pl-1.5">
                <button 
                    onClick={handleZoomOut}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 rounded-full transition-colors"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <button className="h-8 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-full border border-gray-200/60 transition-colors shadow-sm">
                            {Math.round(zoom * 100)}%
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-16">
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(val => (
                             <DropdownMenuItem key={val} onClick={() => setZoom(val)} className="justify-center font-medium text-xs">
                                {val * 100}%
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <button 
                    onClick={handleZoomIn}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 rounded-full transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

             {/* Fit */}
            <div className="flex items-center pl-2.5 border-l border-gray-200/60 ml-1.5">
                 <button 
                    onClick={handleFit} 
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100/80 hover:text-black rounded-full transition-colors"
                    title="Fit to Screen"
                >
                    <Maximize className="w-3.5 h-3.5" />
                    <span>Fit</span>
                </button>
            </div>
        </div>
    );
}
