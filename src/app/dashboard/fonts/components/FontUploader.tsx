'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFont } from '@/lib/db/fonts';
import { toast } from 'sonner';

interface FontUploaderProps {
    onClose: () => void;
    onUploadSuccess: () => void;
}

const CATEGORIES = [
    { value: 'sans-serif', label: 'Sans Serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'display', label: 'Display' },
    { value: 'script', label: 'Script' },
    { value: 'handwriting', label: 'Handwriting' },
    { value: 'monospace', label: 'Monospace' },
] as const;

export function FontUploader({ onClose, onUploadSuccess }: FontUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [fontName, setFontName] = useState('');
    const [category, setCategory] = useState<'sans-serif' | 'serif' | 'display' | 'script' | 'handwriting' | 'monospace'>('sans-serif');
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (selectedFile: File) => {
        const extension = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!extension || !['ttf', 'otf', 'woff', 'woff2'].includes(extension)) {
            toast.error('Please select a valid font file (TTF, OTF, WOFF, or WOFF2)');
            return;
        }

        setFile(selectedFile);
        // Auto-fill font name from filename (remove extension)
        const nameWithoutExt = selectedFile.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
        setFontName(nameWithoutExt);
    };

    const handleUpload = async () => {
        if (!file || !fontName.trim()) {
            toast.error('Please select a file and enter a font name');
            return;
        }

        setUploading(true);
        try {
            const result = await uploadFont(file, fontName.trim(), category);
            if (result) {
                toast.success('Font uploaded successfully!');
                onUploadSuccess();
                onClose();
            } else {
                toast.error('Failed to upload font');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('An error occurred while uploading');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-heading font-bold text-gray-900">Upload Font</h2>
                            <p className="text-sm text-gray-500">Add a custom font to your library</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={uploading}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* File Drop Zone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                            dragActive
                                ? 'border-blue-500 bg-blue-50'
                                : file
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                        )}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".ttf,.otf,.woff,.woff2"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <Check className="w-6 h-6 text-green-600" />
                                </div>
                                <p className="font-medium text-gray-900">{file.name}</p>
                                <p className="text-sm text-gray-500">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-700 font-medium mb-1">
                                    Drop your font file here or click to browse
                                </p>
                                <p className="text-sm text-gray-500">
                                    Supports TTF, OTF, WOFF, WOFF2
                                </p>
                            </>
                        )}
                    </div>

                    {/* Font Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Font Family Name
                        </label>
                        <input
                            type="text"
                            value={fontName}
                            onChange={(e) => setFontName(e.target.value)}
                            placeholder="e.g., Roboto, Open Sans"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as typeof category)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={uploading || !file || !fontName.trim()}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Upload Font
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
