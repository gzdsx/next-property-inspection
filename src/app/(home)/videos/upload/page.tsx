'use client';

import {useCallback, useMemo, useRef, useState} from 'react';
import {
    Upload,
    X,
    FileVideo,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Play,
    ChevronDown,
    ChevronRight,
    Trash2,
    RotateCcw,
    StopCircle,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useBatchVideoUpload, type VideoFileItem, type AnalysisItem, type VideoFileStatus} from '@/hooks/useBatchVideoUpload';

const STATUS_CONFIG: Record<VideoFileStatus, { label: string; color: string; icon: typeof Loader2 }> = {
    pending: {label: 'Pending', color: 'bg-slate-100 text-slate-600', icon: FileVideo},
    uploading: {label: 'Uploading', color: 'bg-blue-100 text-blue-700', icon: Loader2},
    merging: {label: 'Merging', color: 'bg-indigo-100 text-indigo-700', icon: Loader2},
    analyzing: {label: 'AI Analyzing', color: 'bg-purple-100 text-purple-700', icon: Loader2},
    completed: {label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2},
    error: {label: 'Error', color: 'bg-red-100 text-red-700', icon: AlertCircle},
};

const CONDITION_COLORS: Record<string, string> = {
    'New Item': 'bg-emerald-100 text-emerald-800',
    'Good': 'bg-green-100 text-green-800',
    'Fair': 'bg-yellow-100 text-yellow-800',
    'Poor': 'bg-orange-100 text-orange-800',
    'Very Poor': 'bg-red-100 text-red-800',
};

const SEVERITY_COLORS: Record<string, string> = {
    'Low': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Medium': 'bg-orange-50 text-orange-700 border-orange-200',
    'High': 'bg-red-50 text-red-700 border-red-200',
};

function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileStatusBadge({status}: { status: VideoFileStatus }) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    const isAnimated = status === 'uploading' || status === 'merging' || status === 'analyzing';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
            <Icon className={`w-3 h-3 ${isAnimated ? 'animate-spin' : ''}`}/>
            {config.label}
        </span>
    );
}

function FileCard({fileItem, onRemove}: { fileItem: VideoFileItem; onRemove: () => void }) {
    const isActive = fileItem.status === 'uploading' || fileItem.status === 'merging' || fileItem.status === 'analyzing';

    return (
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <FileVideo className="w-5 h-5 text-slate-500"/>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{fileItem.file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                    {formatFileSize(fileItem.file.size)}
                    {fileItem.status === 'completed' && fileItem.items.length > 0 &&
                        <span className="ml-2 text-green-600 font-medium">
                            {fileItem.items.length} items found
                        </span>
                    }
                    {fileItem.error &&
                        <span className="ml-2 text-red-500 font-medium">{fileItem.error}</span>
                    }
                </p>

                {isActive && (
                    <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                            style={{width: `${fileItem.progress}%`}}
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <FileStatusBadge status={fileItem.status}/>
                {(fileItem.status === 'pending' || fileItem.status === 'completed' || fileItem.status === 'error') && (
                    <button
                        onClick={onRemove}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-4 h-4"/>
                    </button>
                )}
            </div>
        </div>
    );
}

function RoomDirectory({items}: { items: AnalysisItem[] }) {
    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

    const roomGroups = useMemo(() => {
        const groups = new Map<string, AnalysisItem[]>();
        for (const item of items) {
            const room = item.room_name || 'Unknown Room';
            if (!groups.has(room)) groups.set(room, []);
            groups.get(room)!.push(item);
        }
        return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [items]);

    const toggleRoom = (room: string) => {
        setExpandedRooms(prev => {
            const next = new Set(prev);
            if (next.has(room)) next.delete(room);
            else next.add(room);
            return next;
        });
    };

    const expandAll = () => {
        setExpandedRooms(new Set(roomGroups.map(([name]) => name)));
    };

    const collapseAll = () => {
        setExpandedRooms(new Set());
    };

    if (items.length === 0) return null;

    const conditionStats = items.reduce((acc, item) => {
        acc[item.condition] = (acc[item.condition] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Room & Inspection Directory</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                            {roomGroups.length} rooms, {items.length} inspection items
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={expandAll}>
                            Expand All
                        </Button>
                        <Button variant="outline" size="sm" onClick={collapseAll}>
                            Collapse All
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(conditionStats).sort().map(([condition, count]) => (
                        <span
                            key={condition}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${CONDITION_COLORS[condition] || 'bg-slate-100 text-slate-700'}`}
                        >
                            {condition}: {count}
                        </span>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {roomGroups.map(([roomName, roomItems]) => {
                        const isExpanded = expandedRooms.has(roomName);
                        const issueCount = roomItems.filter(i => i.severity && i.severity !== '').length;

                        return (
                            <div key={roomName}>
                                <button
                                    onClick={() => toggleRoom(roomName)}
                                    className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors text-left"
                                >
                                    {isExpanded
                                        ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0"/>
                                        : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0"/>
                                    }
                                    <span className="font-semibold text-slate-800 flex-1">{roomName}</span>
                                    <span className="text-xs text-slate-500">{roomItems.length} items</span>
                                    {issueCount > 0 && (
                                        <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                            {issueCount} issue{issueCount > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </button>

                                {isExpanded && (
                                    <div className="px-6 pb-4">
                                        <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                                            <table className="w-full text-sm">
                                                <thead>
                                                <tr className="border-b border-slate-200 bg-slate-100/50">
                                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Item</th>
                                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Description</th>
                                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Condition</th>
                                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Severity</th>
                                                    <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Time</th>
                                                </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                {roomItems
                                                    .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds)
                                                    .map((item) => (
                                                        <tr key={item.id} className="hover:bg-white transition-colors">
                                                            <td className="px-4 py-3 font-medium text-slate-800">{item.item_name}</td>
                                                            <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{item.description}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${CONDITION_COLORS[item.condition] || 'bg-slate-100'}`}>
                                                                    {item.condition}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {item.severity ? (
                                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${SEVERITY_COLORS[item.severity] || 'bg-slate-50'}`}>
                                                                        {item.severity}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-400 text-xs">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs">
                                                                {Math.floor(item.elapsedSeconds / 60)}:{(item.elapsedSeconds % 60).toString().padStart(2, '0')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {roomItems.some(i => i.videoFileName) && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {[...new Set(roomItems.map(i => i.videoFileName).filter(Boolean))].map(name => (
                                                    <span key={name} className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                                        {name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

export default function BatchVideoUploadPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const {
        files,
        addFiles,
        removeFile,
        clearCompleted,
        startProcessing,
        abortAll,
        isProcessing,
        allItems,
        completedCount,
        errorCount,
    } = useBatchVideoUpload({maxConcurrentFiles: 2, maxConcurrentChunks: 3});

    const handleFiles = useCallback((fileList: FileList | File[]) => {
        const videoFiles = Array.from(fileList).filter(f => f.type.startsWith('video/'));
        if (videoFiles.length > 0) {
            addFiles(videoFiles);
        }
    }, [addFiles]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const pendingCount = files.filter(f => f.status === 'pending').length;
    const hasFiles = files.length > 0;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Batch Video Analysis</h1>
                <p className="text-sm text-slate-400 mt-1">
                    Upload multiple inspection walkthrough videos for AI-powered room and defect analysis
                </p>
            </div>

            {/* Upload Zone */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="p-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="video/*"
                        multiple
                        onChange={(e) => {
                            if (e.target.files) handleFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        className={`relative p-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all
                            ${isDragOver
                            ? 'border-blue-400 bg-blue-500/10'
                            : 'border-slate-600 hover:border-blue-500 hover:bg-slate-700/30'
                        }`}
                    >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors
                            ${isDragOver ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                            <Upload className="w-8 h-8"/>
                        </div>
                        <p className="text-base font-semibold text-slate-200">
                            {isDragOver ? 'Drop videos here' : 'Click or drag videos to upload'}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            MP4, WebM, MOV - supports multiple files with chunked upload
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* File List */}
            {hasFiles && (
                <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader className="border-b border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-white">{files.length} Video{files.length > 1 ? 's' : ''} Selected</CardTitle>
                                <p className="text-xs text-slate-400 mt-1">
                                    {pendingCount > 0 && `${pendingCount} pending`}
                                    {completedCount > 0 && `${pendingCount > 0 ? ', ' : ''}${completedCount} completed`}
                                    {errorCount > 0 && `, ${errorCount} failed`}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {completedCount > 0 && (
                                    <Button variant="outline" size="sm" onClick={clearCompleted}>
                                        <Trash2 className="w-3.5 h-3.5 mr-1"/>
                                        Clear Done
                                    </Button>
                                )}
                                {isProcessing ? (
                                    <Button variant="destructive" size="sm" onClick={abortAll}>
                                        <StopCircle className="w-3.5 h-3.5 mr-1"/>
                                        Stop All
                                    </Button>
                                ) : (
                                    pendingCount > 0 && (
                                        <Button size="sm" onClick={startProcessing}>
                                            <Play className="w-3.5 h-3.5 mr-1"/>
                                            Start Analysis ({pendingCount})
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="space-y-2">
                            {files.map(fileItem => (
                                <FileCard
                                    key={fileItem.id}
                                    fileItem={fileItem}
                                    onRemove={() => removeFile(fileItem.id)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Results Directory */}
            {allItems.length > 0 && (
                <RoomDirectory items={allItems}/>
            )}
        </div>
    );
}
