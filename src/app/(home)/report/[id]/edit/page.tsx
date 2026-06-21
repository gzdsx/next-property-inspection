'use client';

import {useEffect, useRef, useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft, Save, Upload, FileVideo, X, Loader2,
    CheckCircle2, AlertCircle, MapPin, FileText, Play,
    Trash2, StopCircle, RotateCcw, Sparkles, Video,
} from 'lucide-react';
import {apiDelete, apiGet, apiPost, apiPut} from '@/lib/api';
import {toast} from 'sonner';
import type {Inspection, InspectionVideo} from '@/types';
import {
    useVideoUploadQueue,
    formatFileSize,
    type UploadFileItem,
    type UploadFileStatus,
} from '@/hooks/useVideoUploadQueue';
import {useConfirm} from "@/contexts/AppContext";

// ─── Component ────────────────────────────────────────────────────────────────

export default function InspectionEditPage() {
    const params = useParams();
    const id = params.id as string;
    const confirm = useConfirm();

    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [videos, setVideos] = useState<InspectionVideo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [notes, setNotes] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        files: uploadFiles,
        addFiles,
        removeFile,
        retryFile,
        clearCompleted,
        clearAll,
        startUpload,
        abortAll,
        isUploading,
        pendingCount,
        completedCount,
        errorCount,
        activeCount,
        totalSize,
        hasFiles,
    } = useVideoUploadQueue({
        maxConcurrentFiles: 5,
        maxConcurrentChunks: 3,
        saveDir: 'videos',
        autoRemoveCompleted: true,
        onFileCompleted: async (_item, serverUrl) => {
            const newVideo = await apiPost(`/inspections/${id}/videos`, {
                src: serverUrl,
                mime_type: _item.file.type,
                status: 'draft'
            });
            setVideos(prev => [...prev, newVideo]);
        },
    });

    // ─── Fetch inspection ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const response = await apiGet(`/inspections/${id}`);
                setInspection(response);
                setVideos(response.videos || []);
            } catch (err: any) {
                toast.error(err.message || 'Failed to load inspection');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id]);

    // ─── Delete a video ───────────────────────────────────────────────────────

    const handleDeleteVideo = async (videoId: number) => {
        confirm.open({
            title: 'Delete Video',
            message: 'Are you sure you want to delete this video?',
            onConfirm: async () => {
                try {
                    await apiDelete(`/inspections/${id}/videos/${videoId}`);
                    setVideos(prev => prev.filter(v => v.id !== videoId));
                    toast.success('Video removed');
                } catch (err: any) {
                    toast.error(err.message || 'Failed to delete video');
                }
            },
        })
    };

    // ─── Save inspection ──────────────────────────────────────────────────────

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await apiPut(`/inspections/${id}`, {subtext: notes});
            toast.success('Inspection saved');
        } catch (err: any) {
            toast.error(err.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Trigger AI analysis ──────────────────────────────────────────────────

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            await apiPost(`/inspections/${id}/analyze`);
            toast.success('AI analysis started in background');
        } catch (err: any) {
            toast.error(err.message || 'Failed to start analysis');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ─── File drop handler ────────────────────────────────────────────────────

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        addFiles(e.dataTransfer.files);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{color: 'var(--primary)'}}/>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6" style={{overflowY: 'auto', height: '100%'}}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Link
                        href={`/report/${id}`}
                        className="flex items-center gap-1.5 text-sm font-semibold mb-2"
                        style={{color: 'var(--text-muted)', textDecoration: 'none'}}
                    >
                        <ChevronLeft className="w-4 h-4"/>
                        Back to Report
                    </Link>
                    <h1 className="text-2xl font-black tracking-tight" style={{color: 'var(--foreground)'}}>
                        Edit Inspection
                    </h1>
                    {inspection?.property && (
                        <p className="text-sm mt-1" style={{color: 'var(--text-muted)'}}>
                            {inspection.property.name} · {inspection.type || 'Inspection'}
                        </p>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || videos.length === 0}
                        className="glass-panel flex items-center gap-2 px-5 py-2.5 font-bold text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                            border: '1px solid var(--panel-border)',
                            borderRadius: '12px',
                            color: isAnalyzing ? 'var(--text-muted)' : 'var(--accent)',
                        }}
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                        {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 font-bold text-sm text-white cursor-pointer"
                        style={{
                            backgroundColor: 'var(--primary)',
                            border: 'none',
                            borderRadius: '12px',
                            opacity: isSaving ? 0.7 : 1,
                        }}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* ── Property Info ────────────────────────────────────────── */}
                <div className="glass-panel" style={{borderRadius: '16px', overflow: 'hidden'}}>
                    <div className="px-6 py-4" style={{borderBottom: '1px solid var(--panel-border)'}}>
                        <h2 className="text-base font-bold flex items-center gap-2">
                            <MapPin className="w-4 h-4" style={{color: 'var(--primary)'}}/>
                            Information
                        </h2>
                    </div>
                    <div className="p-6 flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold flex items-center gap-2"
                                   style={{color: 'var(--text-muted)'}}>
                                <FileText className="w-3.5 h-3.5"/>
                                Inspector Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 text-sm font-medium resize-none"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid var(--panel-border)',
                                    borderRadius: '12px',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                }}
                                placeholder="Add notes about this inspection..."
                            />
                        </div>
                    </div>
                </div>

                {/* ── Videos Section ───────────────────────────────────────── */}
                <div className="glass-panel" style={{borderRadius: '16px', overflow: 'hidden'}}>
                    <div className="px-6 py-4 flex items-center justify-between"
                         style={{borderBottom: '1px solid var(--panel-border)'}}>
                        <div>
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <Video className="w-4 h-4" style={{color: 'var(--primary)'}}/>
                                Walkthrough Videos
                            </h2>
                            <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                                {videos.length} video{videos.length !== 1 ? 's' : ''} attached
                                {hasFiles && ` · ${uploadFiles.length} in upload queue`}
                            </p>
                        </div>

                        {/* Upload controls */}
                        {hasFiles && (
                            <div className="flex items-center gap-2">
                                {completedCount > 0 && (
                                    <button
                                        onClick={clearCompleted}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--panel-border)',
                                            borderRadius: '8px',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3"/>
                                        Clear Done
                                    </button>
                                )}
                                {isUploading ? (
                                    <button
                                        onClick={abortAll}
                                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold cursor-pointer"
                                        style={{
                                            background: 'var(--danger-bg)',
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            borderRadius: '8px',
                                            color: 'var(--danger)',
                                        }}
                                    >
                                        <StopCircle className="w-3.5 h-3.5"/>
                                        Stop All
                                    </button>
                                ) : (
                                    pendingCount > 0 && (
                                        <button
                                            onClick={startUpload}
                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                                            style={{
                                                backgroundColor: 'var(--primary)',
                                                border: 'none',
                                                borderRadius: '8px',
                                            }}
                                        >
                                            <Play className="w-3.5 h-3.5"/>
                                            Upload {pendingCount} Video{pendingCount > 1 ? 's' : ''}
                                        </button>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-4 flex flex-col gap-2">
                        {/* ── Existing videos (green tint) ──────────────── */}
                        {videos.map(video => (
                            <div key={video.id} className="flex items-center gap-4 p-4"
                                 style={{
                                     background: 'rgba(16,185,129,0.04)',
                                     borderRadius: '12px',
                                     border: '1px solid rgba(16,185,129,0.15)',
                                 }}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                     style={{backgroundColor: 'var(--success-bg)'}}>
                                    <CheckCircle2 className="w-5 h-5" style={{color: 'var(--success)'}}/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate"
                                       style={{color: 'var(--foreground)'}}>
                                        {video.src?.split('/').pop() || `Video #${video.id}`}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{color: 'var(--text-muted)'}}>
                                        {video.mime_type} · {new Date(video.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <span
                                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                    style={{
                                        backgroundColor: video.status === 'completed' ? 'var(--success-bg)' : 'var(--warning-bg)',
                                        color: video.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                                    }}
                                >
                                    {video.status || 'uploaded'}
                                </span>
                                <button
                                    onClick={() => handleDeleteVideo(video.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-dark)',
                                    }}
                                    title="Remove video"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                            </div>
                        ))}

                        {/* ── Upload queue ──────────────────────────────────── */}
                        {uploadFiles.map(item => (
                            <UploadFileRow
                                key={item.id}
                                item={item}
                                onRemove={() => removeFile(item.id)}
                                onRetry={() => retryFile(item.id)}
                            />
                        ))}

                        {/* ── Drop zone (only when queue is empty) ─────────── */}
                        {!hasFiles && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="video/*"
                                    multiple
                                    onChange={e => {
                                        if (e.target.files) addFiles(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={e => {
                                        e.preventDefault();
                                        setIsDragOver(true);
                                    }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={handleDrop}
                                    className="cursor-pointer flex flex-col items-center justify-center p-10 transition-all mt-1"
                                    style={{
                                        border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--panel-border)'}`,
                                        borderRadius: '16px',
                                        background: isDragOver ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
                                    }}
                                >
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors"
                                        style={{
                                            background: isDragOver ? 'var(--primary-bg)' : 'rgba(255,255,255,0.05)',
                                            color: isDragOver ? 'var(--primary)' : 'var(--text-muted)',
                                        }}
                                    >
                                        <Upload className="w-7 h-7"/>
                                    </div>
                                    <p className="text-sm font-bold" style={{color: 'var(--foreground)'}}>
                                        {isDragOver ? 'Drop videos here' : 'Click or drag videos to upload'}
                                    </p>
                                    <p className="text-xs mt-1" style={{color: 'var(--text-dark)'}}>
                                        MP4, WebM, MOV · max 5 concurrent uploads · chunked transfer
                                    </p>
                                </div>
                            </>
                        )}

                        {/* ── Summary bar (when queue has files) ────────────── */}
                        {hasFiles && (
                            <div className="flex items-center justify-between px-2 pt-2"
                                 style={{borderTop: '1px solid var(--panel-border)', marginTop: '4px'}}>
                                <span className="text-xs" style={{color: 'var(--text-dark)'}}>
                                    {uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''} ({formatFileSize(totalSize)})
                                </span>
                                <div className="flex gap-3">
                                    {activeCount > 0 && (
                                        <span className="text-xs" style={{color: 'var(--primary)'}}>
                                            {activeCount} uploading
                                        </span>
                                    )}
                                    {pendingCount > 0 && (
                                        <span className="text-xs" style={{color: 'var(--text-dark)'}}>
                                            {pendingCount} pending
                                        </span>
                                    )}
                                    {completedCount > 0 && (
                                        <span className="text-xs" style={{color: 'var(--success)'}}>
                                            {completedCount} done
                                        </span>
                                    )}
                                    {errorCount > 0 && (
                                        <span className="text-xs" style={{color: 'var(--danger)'}}>
                                            {errorCount} failed
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="h-12"/>
        </div>
    );
}

// ─── Upload File Row ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<UploadFileStatus, {
    label: string;
    colorVar: string;
    bgVar: string;
    Icon: typeof Loader2;
    spin: boolean;
}> = {
    pending: {label: 'Pending', colorVar: '--text-muted', bgVar: '--panel-border', Icon: FileVideo, spin: false},
    uploading: {label: 'Uploading', colorVar: '--primary', bgVar: '--primary-bg', Icon: Loader2, spin: true},
    merging: {label: 'Merging', colorVar: '--accent', bgVar: '--primary-bg', Icon: Loader2, spin: true},
    saving: {label: 'Saving', colorVar: '--info', bgVar: '--primary-bg', Icon: Loader2, spin: true},
    completed: {label: 'Done', colorVar: '--success', bgVar: '--success-bg', Icon: CheckCircle2, spin: false},
    error: {label: 'Failed', colorVar: '--danger', bgVar: '--danger-bg', Icon: AlertCircle, spin: false},
};

function UploadFileRow({item, onRemove, onRetry}: {
    item: UploadFileItem;
    onRemove: () => void;
    onRetry: () => void;
}) {
    const cfg = STATUS_MAP[item.status];
    const Icon = cfg.Icon;
    const isActive = item.status === 'uploading' || item.status === 'merging' || item.status === 'saving';
    const label = isActive && item.status === 'uploading' ? `${item.progress}%` : cfg.label;

    return (
        <div className="flex items-center gap-4 p-4 transition-colors"
             style={{
                 background: isActive ? 'rgba(59,130,246,0.04)' : 'rgba(99,102,241,0.03)',
                 borderRadius: '12px',
                 border: `1px solid ${isActive ? 'rgba(59,130,246,0.25)' : 'rgba(99,102,241,0.12)'}`,
             }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                 style={{backgroundColor: `var(${cfg.bgVar})`}}>
                <FileVideo className="w-5 h-5" style={{color: `var(${cfg.colorVar})`}}/>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{color: 'var(--foreground)'}}>
                    {item.file.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{color: 'var(--text-muted)'}}>
                        {formatFileSize(item.file.size)}
                    </span>
                    {item.error && item.error !== 'Cancelled' && (
                        <span className="text-xs" style={{color: 'var(--danger)'}}>{item.error}</span>
                    )}
                </div>
                {isActive && (
                    <div className="mt-2 w-full rounded-full h-1.5 overflow-hidden"
                         style={{background: 'rgba(255,255,255,0.06)'}}>
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${item.progress}%`,
                                background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{backgroundColor: `var(${cfg.bgVar})`, color: `var(${cfg.colorVar})`}}
                >
                    <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`}/>
                    {label}
                </span>

                {item.status === 'error' && (
                    <button
                        onClick={onRetry}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--primary)'}}
                        title="Retry"
                    >
                        <RotateCcw className="w-3.5 h-3.5"/>
                    </button>
                )}

                {(item.status === 'pending' || item.status === 'completed' || item.status === 'error') && (
                    <button
                        onClick={onRemove}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{background: 'transparent', border: 'none', color: 'var(--text-dark)'}}
                    >
                        <X className="w-4 h-4"/>
                    </button>
                )}
            </div>
        </div>
    );
}
