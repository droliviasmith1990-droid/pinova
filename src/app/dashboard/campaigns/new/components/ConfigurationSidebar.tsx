'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
    Upload, 
    FileSpreadsheet, 
    RefreshCw, 
    AlertCircle, 
    Loader2, 
    FileText, 
    Table,
    Link2,
    Check,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { parseCSVFile } from '@/lib/utils/csvParser';
import { fetchCsvFromUrl, validateCsvUrl } from '@/lib/utils/csvUrlParser';

type UploadTab = 'file' | 'url';

interface ConfigurationSidebarProps {
    className?: string;
}

export function ConfigurationSidebar({ className }: ConfigurationSidebarProps) {
    const { 
        campaignName, 
        setCampaignName, 
        campaignDescription, 
        setCampaignDescription,
        csvData,
        setCSVData 
    } = useCampaignWizard();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Local state
    const [nameError, setNameError] = useState(false);
    const [activeTab, setActiveTab] = useState<UploadTab>('file');
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // URL import state
    const [urlInput, setUrlInput] = useState('');
    const [urlValid, setUrlValid] = useState<boolean | null>(null);
    
    // Validation
    const validateName = useCallback(() => {
        if (!campaignName.trim()) {
            setNameError(true);
            return false;
        }
        setNameError(false);
        return true;
    }, [campaignName]);
    
    // Validate URL as user types
    const handleUrlChange = useCallback((value: string) => {
        setUrlInput(value);
        if (value.trim()) {
            const result = validateCsvUrl(value);
            setUrlValid(result.valid);
        } else {
            setUrlValid(null);
        }
    }, []);
    
    // Handle file upload
    const handleFile = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await parseCSVFile(file);

            if (result.success) {
                setCSVData({
                    headers: result.headers,
                    rows: result.data,
                    fileName: file.name,
                    rowCount: result.rowCount,
                });
            } else {
                setError(result.error || 'Failed to parse CSV');
                setCSVData(null);
            }
        } catch {
            setError('Failed to read file');
            setCSVData(null);
        } finally {
            setIsLoading(false);
        }
    }, [setCSVData]);
    
    // Handle URL import
    const handleUrlImport = useCallback(async () => {
        if (!urlInput.trim() || !urlValid) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await fetchCsvFromUrl(urlInput);

            if (result.success) {
                setCSVData({
                    headers: result.headers,
                    rows: result.data,
                    fileName: `Imported from URL`,
                    rowCount: result.rowCount,
                    sourceUrl: result.sourceUrl,
                });
                setUrlInput('');
                setUrlValid(null);
            } else {
                setError(result.error || 'Failed to import CSV from URL');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import CSV');
        } finally {
            setIsLoading(false);
        }
    }, [urlInput, urlValid, setCSVData]);
    
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            handleFile(file);
        } else {
            setError('Please upload a CSV file');
        }
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleReplace = useCallback(() => {
        setCSVData(null);
        setError(null);
        setUrlInput('');
        setUrlValid(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [setCSVData]);

    return (
        <aside className={cn(
            "bg-surface-light border border-white/20 rounded-2xl p-6 space-y-8 shadow-creative-sm",
            "lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto custom-scrollbar",
            className
        )}>
            {/* Configuration Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="font-heading font-semibold text-gray-900 text-lg">Configuration</h2>
                    <p className="text-xs text-gray-500 font-medium">Setup your campaign details</p>
                </div>
            </div>
            
            {/* Campaign Name */}
            <div className="space-y-2">
                <label 
                    htmlFor="campaign-name" 
                    className="block text-sm font-semibold text-gray-700"
                >
                    Campaign Name <span className="text-primary-creative">*</span>
                </label>
                <input
                    id="campaign-name"
                    type="text"
                    value={campaignName}
                    onChange={(e) => {
                        setCampaignName(e.target.value);
                        if (nameError && e.target.value.trim()) setNameError(false);
                    }}
                    onBlur={validateName}
                    placeholder="e.g. Summer Collection Launch"
                    maxLength={100}
                    className={cn(
                        "w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm transition-all duration-200",
                        "focus:ring-2 focus:ring-primary-creative/20 focus:border-primary-creative focus:bg-white",
                        nameError 
                            ? "border-red-400 bg-red-50/50" 
                            : "border-gray-200 hover:border-gray-300"
                    )}
                />
                {nameError && (
                    <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Campaign name is required
                    </p>
                )}
            </div>
            
            {/* Description */}
            <div className="space-y-2">
                <label 
                    htmlFor="campaign-description" 
                    className="block text-sm font-semibold text-gray-700"
                >
                    Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                    id="campaign-description"
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    placeholder="Add notes about this campaign..."
                    maxLength={500}
                    rows={3}
                    className={cn(
                        "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none transition-all duration-200",
                        "focus:ring-2 focus:ring-primary-creative/20 focus:border-primary-creative focus:bg-white",
                        "hover:border-gray-300"
                    )}
                />
                <p className="text-xs text-gray-400 text-right font-medium">
                    {campaignDescription.length}/500
                </p>
            </div>
            
            {/* Data Source */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Data Source
                    </h3>
                    {csvData && (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide rounded-full shadow-sm">
                            Active
                        </span>
                    )}
                </div>
                
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                
                {/* Tab Switcher */}
                {!csvData && (
                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => setActiveTab('file')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                activeTab === 'file'
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Upload File
                        </button>
                        <button
                            onClick={() => setActiveTab('url')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                activeTab === 'url'
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Link2 className="w-3.5 h-3.5" />
                            Import URL
                        </button>
                    </div>
                )}
                
                {/* File Upload Tab */}
                {!csvData && activeTab === 'file' && (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !isLoading && fileInputRef.current?.click()}
                        className={cn(
                            "group relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer overflow-hidden",
                            isLoading
                                ? "border-blue-300 bg-blue-50/50 cursor-wait"
                                : isDragging
                                    ? "border-primary-creative bg-primary-creative/5"
                                    : "border-gray-200 hover:border-primary-creative/50 hover:bg-gray-50"
                        )}
                    >
                        {/* Interactive Background Gradient */}
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-tr from-primary-creative/5 to-accent-1/5 opacity-0 transition-opacity duration-300",
                            (isDragging || (!isLoading && !csvData)) && "group-hover:opacity-100"
                        )} />

                        {isLoading ? (
                            <div className="relative z-10 flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-primary-creative animate-spin" />
                                <p className="text-sm font-medium text-primary-creative">Parsing CSV...</p>
                            </div>
                        ) : (
                            <div className="relative z-10">
                                <div className={cn(
                                    "w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center transition-transform duration-300",
                                    isDragging ? "scale-110 bg-blue-100" : "group-hover:scale-110"
                                )}>
                                    <Upload className={cn(
                                        "w-6 h-6 transition-colors",
                                        isDragging ? "text-primary-creative" : "text-gray-400 group-hover:text-primary-creative"
                                    )} />
                                </div>
                                <p className="text-sm font-semibold text-gray-900">
                                    Click to upload CSV
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    or drag and drop file here
                                </p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* URL Import Tab */}
                {!csvData && activeTab === 'url' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* URL Input */}
                        <div className="relative">
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => handleUrlChange(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/..."
                                className={cn(
                                    "w-full px-4 py-2.5 pr-10 border rounded-xl text-sm transition-all",
                                    "focus:ring-2 focus:ring-primary-creative/20 focus:border-primary-creative bg-gray-50 focus:bg-white",
                                    urlValid === true ? "border-green-400 bg-green-50/10" : 
                                    urlValid === false ? "border-red-400 bg-red-50/10" : "border-gray-200"
                                )}
                                disabled={isLoading}
                            />
                            {urlValid !== null && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {urlValid ? (
                                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-green-600" />
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                                            <X className="w-3 h-3 text-red-600" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Import Button */}
                        <button
                            onClick={handleUrlImport}
                            disabled={!urlInput.trim() || !urlValid || isLoading}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all transform active:scale-95",
                                (!urlInput.trim() || !urlValid || isLoading)
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-primary-creative text-white hover:bg-primary-creative/90 shadow-primary-creative/20"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Importing...</span>
                                </>
                            ) : (
                                <>
                                    <Link2 className="w-4 h-4" />
                                    <span>Import Data</span>
                                </>
                            )}
                        </button>
                        
                        {/* Supported Sources */}
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-blue-800 uppercase mb-1.5 opacity-70">Supported Sources</p>
                            <ul className="text-xs text-blue-700 space-y-1 font-medium">
                                <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400"/> Google Sheets (CSV Export)</li>
                                <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400"/> Dropbox Public Links</li>
                            </ul>
                        </div>
                    </div>
                )}
                
                {/* CSV Loaded State */}
                {csvData && (
                    <div className="group relative bg-white border border-green-200 rounded-xl p-4 shadow-sm overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                                onClick={handleReplace}
                                className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 hover:scale-110 transition-all"
                                title="Remove File"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20">
                                <FileSpreadsheet className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                                <p className="font-semibold text-gray-900 truncate text-sm">
                                    {csvData.fileName}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-600 flex items-center gap-1">
                                        <Table className="w-3 h-3" /> {csvData.rowCount}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-600 flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> {csvData.headers.length}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {csvData.sourceUrl && (
                             <div className="mt-3 pt-3 border-t border-dashed border-gray-100 flex items-center gap-1.5 text-xs text-blue-600">
                                <Link2 className="w-3 h-3" />
                                <span className="truncate opacity-80">Syncing from URL</span>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Error */}
                {error && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-red-700">{error}</p>
                    </div>
                )}
            </div>
        </aside>
    );
}
