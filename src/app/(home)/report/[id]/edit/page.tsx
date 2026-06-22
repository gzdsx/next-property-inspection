'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Link from 'next/link';
import {useSortable} from '@dnd-kit/react/sortable';
import {
    ChevronLeft, Save, Upload, FileVideo, X, Loader2,
    CheckCircle2, AlertCircle, MapPin, FileText, Play,
    Trash2, StopCircle, RotateCcw, Sparkles, Video,
    GripVertical,
} from 'lucide-react';
import {apiGet, apiPost, apiPut} from '@/lib/api';
import {toast} from 'sonner';
import type {Inspection} from '@/types';
import {
    useVideoUploadQueue,
    formatFileSize,
    type UploadFileItem,
    type UploadFileStatus,
} from '@/hooks/useVideoUploadQueue';
import SortableProvider from '@/components/common/SortableProvider';

export default function InspectionEditPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [notes, setNotes] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        files: uploadFiles,
        addFiles,
        removeFile,
        retryFile,
        reorderFiles,
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
        onFileCompleted: (file, videoData) => {
            apiPost(`/inspections/${id}/videos`, {
                src: videoData.path,
                chunk_index: file.chunk_index,
                status: 'pending'
            });
        },
    });

    // ─── Fetch inspection ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const response = await apiGet(`/inspections/${id}`);
                setInspection(response);
                setNotes(response.subtext || '');
            } catch (err: any) {
                toast.error(err.message || 'Failed to load inspection');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id]);

    // ─── After all uploads complete → merge ───────────────────────────────────

    const allUploaded = hasFiles && uploadFiles.length > 0
        && uploadFiles.every(f => f.status === 'completed' || f.status === 'error')
        && uploadFiles.some(f => f.status === 'completed');
    const completedFiles = uploadFiles.filter(f => f.status === 'completed' && f.url);

    const mergeVideo = async () => {
        try {
            setIsMerging(true);
            const videoSources = completedFiles.map(f => ({
                src: f.url!,
                mime_type: f.file.type,
            }));

            await apiPost(`/inspections/${id}/videos/merge`, {videos: videoSources});

            clearAll();
            toast.success('Videos merged successfully');
            router.push(`/report/${id}`);
        } catch (err: any) {
            toast.error(err.message || 'Video merge failed');
        }finally {
            setIsMerging(false);
        }
    }

    useEffect(() => {
        if (!allUploaded || isMerging || !completedFiles.length) return;
        mergeVideo();
    }, [allUploaded]);

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

    // ─── Drag & drop files ────────────────────────────────────────────────────

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        addFiles(e.dataTransfer.files);
    };

    const handleSortEnd = useCallback((oldIndex: number, newIndex: number) => {
        reorderFiles(oldIndex, newIndex);
    }, [reorderFiles]);

    const canReorder = !isUploading && pendingCount > 0;

    // ─── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{color: 'var(--primary)'}}/>
            </div>
        );
    }

    // Fullscreen merge spinner
    if (isMerging) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(11,15,25,0.95)', backdropFilter: 'blur(20px)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '24px',
            }}>
                <div style={{position: 'relative', width: '80px', height: '80px'}}>
                    <Loader2
                        className="animate-spin"
                        style={{width: '80px', height: '80px', color: 'var(--primary)'}}
                    />
                </div>
                <div style={{textAlign: 'center'}}>
                    <h2 style={{
                        fontSize: '1.5rem', fontWeight: '900', color: 'var(--foreground)',
                        letterSpacing: '-0.5px', marginBottom: '8px',
                    }}>
                        Merging Videos...
                    </h2>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '360px', lineHeight: '1.6'}}>
                        The server is combining {completedCount} video{completedCount !== 1 ? 's' : ''} into a single
                        walkthrough.
                        This may take a few minutes.
                    </p>
                </div>
                <div style={{
                    width: '200px', height: '4px', borderRadius: '2px',
                    background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
                }}>
                    <div style={{
                        width: '40%', height: '100%', borderRadius: '2px',
                        background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                        animation: 'mergeProgress 1.5s ease-in-out infinite',
                    }}/>
                </div>
                <style>{`
                    @keyframes mergeProgress {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(350%); }
                    }
                `}</style>
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
                                Upload Videos
                            </h2>
                            <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                                {hasFiles
                                    ? `${uploadFiles.length} video${uploadFiles.length > 1 ? 's' : ''} · drag to reorder · upload then merge`
                                    : 'Add videos to upload and merge into a single walkthrough'
                                }
                            </p>
                        </div>

                        {hasFiles && (
                            <div className="flex items-center gap-2">
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
                                    <>
                                        <button
                                            onClick={clearAll}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--panel-border)',
                                                borderRadius: '8px',
                                                color: 'var(--text-muted)',
                                            }}
                                        >
                                            <Trash2 className="w-3 h-3"/>
                                            Clear All
                                        </button>
                                        {pendingCount > 0 && (
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
                                                Upload & Merge ({pendingCount})
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-4">
                        {/* ── Sortable upload queue ─────────────────────────── */}
                        {hasFiles && (
                            <div className="flex flex-col gap-2">
                                <SortableProvider onSortEnd={handleSortEnd}>
                                    {uploadFiles.map((item, index) => (
                                        <SortableFileRow
                                            key={item.id}
                                            item={item}
                                            index={index}
                                            canDrag={canReorder}
                                            onRemove={() => removeFile(item.id)}
                                            onRetry={() => retryFile(item.id)}
                                        />
                                    ))}
                                </SortableProvider>

                                {/* Summary */}
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
                            </div>
                        )}

                        {/* ── Drop zone (when no files) ────────────────────── */}
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
                                    className="cursor-pointer flex flex-col items-center justify-center p-10 transition-all"
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
                                        MP4, WebM, MOV · drag to reorder · auto-merge after upload
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="h-12"/>
        </div>
    );
}

// ─── Sortable File Row ────────────────────────────────────────────────────────

const STATUS_MAP: Record<UploadFileStatus, {
    label: string; colorVar: string; bgVar: string; Icon: typeof Loader2; spin: boolean;
}> = {
    pending: {label: 'Pending', colorVar: '--text-muted', bgVar: '--panel-border', Icon: FileVideo, spin: false},
    uploading: {label: 'Uploading', colorVar: '--primary', bgVar: '--primary-bg', Icon: Loader2, spin: true},
    merging: {label: 'Merging', colorVar: '--accent', bgVar: '--primary-bg', Icon: Loader2, spin: true},
    saving: {label: 'Saving', colorVar: '--info', bgVar: '--primary-bg', Icon: Loader2, spin: true},
    completed: {label: 'Done', colorVar: '--success', bgVar: '--success-bg', Icon: CheckCircle2, spin: false},
    error: {label: 'Failed', colorVar: '--danger', bgVar: '--danger-bg', Icon: AlertCircle, spin: false},
};

function SortableFileRow({item, index, canDrag, onRemove, onRetry}: {
    item: UploadFileItem;
    index: number;
    canDrag: boolean;
    onRemove: () => void;
    onRetry: () => void;
}) {
    const {ref, isDragging} = useSortable({
        id: item.id,
        index,
        disabled: !canDrag,
        transition: {duration: 250, easing: 'ease'},
    });

    const cfg = STATUS_MAP[item.status];
    const Icon = cfg.Icon;
    const isActive = item.status === 'uploading' || item.status === 'merging' || item.status === 'saving';
    const label = isActive && item.status === 'uploading' ? `${item.progress}%` : cfg.label;

    return (
        <div
            ref={ref}
            className="flex items-center gap-3 p-4 transition-all"
            style={{
                background: isDragging ? 'rgba(59,130,246,0.08)' : isActive ? 'rgba(59,130,246,0.04)' : 'rgba(99,102,241,0.03)',
                borderRadius: '12px',
                border: `1px solid ${isDragging ? 'var(--primary)' : isActive ? 'rgba(59,130,246,0.25)' : 'rgba(99,102,241,0.12)'}`,
                opacity: isDragging ? 0.7 : 1,
                cursor: canDrag ? 'grab' : 'default',
            }}
        >
            {/* Drag handle */}
            <div style={{
                color: canDrag ? 'var(--text-muted)' : 'var(--panel-border)',
                flexShrink: 0,
            }}>
                <GripVertical className="w-4 h-4"/>
            </div>

            {/* Order number */}
            <div style={{
                width: '24px', height: '24px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 'bold',
                flexShrink: 0,
            }}>
                {index + 1}
            </div>

            {/* Icon */}
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                 style={{backgroundColor: `var(${cfg.bgVar})`}}>
                <FileVideo className="w-4 h-4" style={{color: `var(${cfg.colorVar})`}}/>
            </div>

            {/* File info */}
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

            {/* Status + actions */}
            <div className="flex items-center gap-2 shrink-0">
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{backgroundColor: `var(${cfg.bgVar})`, color: `var(${cfg.colorVar})`}}
                >
                    <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`}/>
                    {label}
                </span>

                {item.status === 'error' && (
                    <button onClick={onRetry}
                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                            style={{background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--primary)'}}>
                        <RotateCcw className="w-3.5 h-3.5"/>
                    </button>
                )}

                {(item.status === 'pending' || item.status === 'error') && (
                    <button onClick={onRemove}
                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                            style={{background: 'transparent', border: 'none', color: 'var(--text-dark)'}}>
                        <X className="w-4 h-4"/>
                    </button>
                )}
            </div>
        </div>
    );
}
