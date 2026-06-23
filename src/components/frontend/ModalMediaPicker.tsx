'use client';

import {useState, useEffect, useCallback, useRef} from 'react';
import {
    Search, Upload, Loader2, Check, Trash2, Image as ImageIcon, X,
    RefreshCw, FileImage, Calendar, Link2, Maximize2,
} from 'lucide-react';
import {apiGet, apiPost, apiDelete} from '@/lib/api';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';

export interface MediaItem {
    id: number;
    user_id: number;
    name: string;
    description: string;
    src: string;
    thumbnail: string;
    width: string;
    height: string;
    type: string;
    extension: string;
    size: number;
    mime: string;
    views: number;
    downloads: number;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

interface UploadingFile {
    id: string;
    name: string;
    progress: number;
    status: 'uploading' | 'done' | 'error';
    error?: string;
}

interface ModalMediaPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (items: MediaItem[]) => void;
    multiple?: boolean;
}

function formatSize(bytes: number) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function ModalMediaPicker({open, onClose, onSelect, multiple = false}: ModalMediaPickerProps) {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [selected, setSelected] = useState<MediaItem[]>([]);
    const [preview, setPreview] = useState<MediaItem | null>(null);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [uploads, setUploads] = useState<UploadingFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Fetch ────────────────────────────────────────────────────────────────

    const fetchItems = useCallback(async (reset = false) => {
        setIsLoading(true);
        try {
            const currentOffset = reset ? 0 : offset;
            const res = await apiGet('/materials', {
                offset: currentOffset,
                limit: 64,
                type: 'image',
                q: search,
            });
            const data = res.data || res;
            const list = data.items || data || [];
            setTotal(data.total || list.length);
            if (reset) {
                setItems(list);
                setOffset(0);
            } else {
                setItems(prev => currentOffset === 0 ? list : [...prev, ...list]);
            }
        } catch {
            toast.error('Failed to load images');
        } finally {
            setIsLoading(false);
        }
    }, [offset, search]);

    useEffect(() => {
        if (open) {
            setSelected([]);
            setPreview(null);
            setOffset(0);
            setUploads([]);
            fetchItems(true);
        }
    }, [open]);

    useEffect(() => {
        if (open && offset > 0) fetchItems();
    }, [offset]);

    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            setOffset(0);
            fetchItems(true);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // ─── Batch Upload ─────────────────────────────────────────────────────────

    const handleUpload = async (fileList: FileList) => {
        const files = Array.from(fileList);
        if (files.length === 0) return;

        const uploadItems: UploadingFile[] = files.map(f => ({
            id: crypto.randomUUID(),
            name: f.name,
            progress: 0,
            status: 'uploading' as const,
        }));
        setUploads(prev => [...uploadItems, ...prev]);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const uid = uploadItems[i].id;

            try {
                setUploads(prev => prev.map(u => u.id === uid ? {...u, progress: 30} : u));

                const formData = new FormData();
                formData.append('file', file);

                setUploads(prev => prev.map(u => u.id === uid ? {...u, progress: 70} : u));

                const res = await apiPost('/materials', formData);
                const newItem = res.data || res;

                setItems(prev => [newItem, ...prev]);
                setUploads(prev => prev.map(u => u.id === uid ? {...u, progress: 100, status: 'done'} : u));
            } catch (err: any) {
                setUploads(prev => prev.map(u =>
                    u.id === uid ? {...u, status: 'error', error: err.message || 'Failed'} : u
                ));
            }
        }

        setTimeout(() => {
            setUploads(prev => prev.filter(u => u.status !== 'done'));
        }, 1500);
    };

    // ─── Select ───────────────────────────────────────────────────────────────

    const toggleSelect = (item: MediaItem) => {
        setPreview(item);
        if (multiple) {
            setSelected(prev =>
                prev.find(s => s.id === item.id)
                    ? prev.filter(s => s.id !== item.id)
                    : [...prev, item]
            );
        } else {
            setSelected([item]);
        }
    };

    const isSelected = (item: MediaItem) => selected.some(s => s.id === item.id);

    // ─── Delete ───────────────────────────────────────────────────────────────

    const handleDelete = async (id: number) => {
        try {
            await apiDelete(`/materials/${id}`);
            setItems(prev => prev.filter(i => i.id !== id));
            setSelected(prev => prev.filter(s => s.id !== id));
            if (preview?.id === id) setPreview(null);
            toast.success('Image deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    // ─── Confirm ──────────────────────────────────────────────────────────────

    const handleConfirm = () => {
        if (selected.length > 0) {
            onSelect(selected);
            onClose();
        }
    };

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url).then(() => toast.success('URL copied'));
    };

    const isUploadActive = uploads.some(u => u.status === 'uploading');

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent
                className="h-[85vh]! flex flex-col w-[80vw]! max-w-none! z-999!"
                style={{background: 'var(--background)', border: '1px solid var(--panel-border)', overflow: 'hidden'}}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon size={18}/>
                        Image Library
                        {selected.length > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 ml-2">
                                {selected.length} selected
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* Toolbar */}
                <div className="flex items-center gap-3 py-2">
                    <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <Search size={14} className="text-(--text-muted) shrink-0"/>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-(--text-muted)"
                            placeholder="Search images..."
                        />
                        {search && (
                            <button onClick={() => setSearch('')}
                                    className="text-(--text-muted) hover:text-foreground border-none bg-transparent cursor-pointer">
                                <X size={14}/>
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => { setOffset(0); fetchItems(true); }}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-(--text-muted) cursor-pointer hover:text-foreground transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''}/>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={e => { if (e.target.files) handleUpload(e.target.files); e.target.value = ''; }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadActive}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer border-none disabled:opacity-50"
                    >
                        {isUploadActive ? <Loader2 size={13} className="animate-spin"/> : <Upload size={13}/>}
                        Upload
                    </button>
                </div>

                {/* Upload progress bar */}
                {uploads.length > 0 && (
                    <div className="flex flex-col gap-1.5 py-1.5 px-1">
                        {uploads.map(u => (
                            <div key={u.id} className="flex items-center gap-2 text-xs">
                                <span className="truncate flex-1 text-(--text-muted)" style={{maxWidth: '180px'}}>{u.name}</span>
                                {u.status === 'uploading' && (
                                    <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{width: `${u.progress}%`}}/>
                                    </div>
                                )}
                                {u.status === 'done' && <Check size={13} className="text-emerald-400 shrink-0"/>}
                                {u.status === 'error' && <span className="text-red-400 shrink-0 text-[0.65rem]">{u.error || 'Error'}</span>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Content: grid + detail */}
                <div className="flex gap-4 flex-1 min-h-0">
                    {/* Image grid */}
                    <div className="flex-1 overflow-y-auto rounded-lg border border-white/8 p-3">
                        {isLoading && items.length === 0 ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500"/>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-(--text-muted)">
                                <ImageIcon size={40} className="opacity-30 mb-3"/>
                                <p className="text-sm font-bold">No images found</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-8 gap-2">
                                    {items.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleSelect(item)}
                                            className="relative cursor-pointer rounded-lg overflow-hidden bg-white/5 transition-all hover:shadow-lg"
                                            style={{
                                                border: isSelected(item) ? '2px solid #3b82f6' : '2px solid transparent',
                                            }}
                                        >
                                            <div className="aspect-4/3 overflow-hidden">
                                                <img
                                                    src={item.thumbnail || item.src}
                                                    alt={item.name || ''}
                                                    className="w-full h-full object-cover!"
                                                    loading="lazy"
                                                />
                                            </div>
                                            {isSelected(item) && (
                                                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                    <Check size={12} className="text-white"/>
                                                </div>
                                            )}
                                            <div className="px-2 py-1.5">
                                                <p className="text-[0.65rem] font-medium text-foreground truncate">{item.name || item.src?.split('/').pop()}</p>
                                                <p className="text-[0.6rem] text-(--text-muted)">{formatSize(item.size)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {items.length < total && (
                                    <div className="flex justify-center mt-4">
                                        <button
                                            onClick={() => setOffset(prev => prev + 64)}
                                            disabled={isLoading}
                                            className="text-xs font-semibold text-blue-400 bg-transparent border-none cursor-pointer hover:text-blue-300 disabled:opacity-50"
                                        >
                                            {isLoading ? 'Loading...' : 'Load more'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Detail panel */}
                    <div className="w-56 shrink-0 rounded-lg border border-white/8 p-4 overflow-y-auto flex flex-col">
                        {preview ? (
                            <>
                                <div className="rounded-lg bg-white/5 mb-4">
                                    <img
                                        src={preview.thumbnail || preview.src}
                                        alt={preview.name || ''}
                                        className="w-full ant-space-4/3! object-cover!"
                                    />
                                </div>
                                <div className="flex flex-col gap-3 text-xs flex-1">
                                    <div>
                                        <span className="text-(--text-muted) font-semibold flex items-center gap-1 mb-0.5">
                                            <FileImage size={11}/> Name
                                        </span>
                                        <p className="text-foreground font-medium break-all m-0">{preview.name || '-'}</p>
                                    </div>
                                    {preview.width && preview.height && (
                                        <div>
                                            <span className="text-(--text-muted) font-semibold flex items-center gap-1 mb-0.5">
                                                <Maximize2 size={11}/> Dimensions
                                            </span>
                                            <p className="text-foreground m-0">{preview.width} × {preview.height}</p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-(--text-muted) font-semibold mb-0.5 block">Size</span>
                                        <p className="text-foreground m-0">{formatSize(preview.size)} · {preview.extension?.toUpperCase() || preview.mime || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-(--text-muted) font-semibold flex items-center gap-1 mb-0.5">
                                            <Calendar size={11}/> Date
                                        </span>
                                        <p className="text-foreground m-0">{preview.created_at || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-(--text-muted) font-semibold flex items-center gap-1 mb-0.5">
                                            <Link2 size={11}/> URL
                                        </span>
                                        <p className="text-blue-400 text-[0.65rem] break-all m-0 cursor-pointer hover:underline"
                                           onClick={() => handleCopyUrl(preview.src)}>
                                            {preview.src}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(preview.id)}
                                    className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border-none cursor-pointer hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 size={13}/> Delete
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 text-(--text-muted)">
                                <ImageIcon size={36} className="opacity-20 mb-3"/>
                                <p className="text-xs font-semibold">No image selected</p>
                                <p className="text-[0.65rem] mt-1">Click an image to preview</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={selected.length === 0}>
                        <Check className="w-4 h-4 mr-1"/>
                        Confirm ({selected.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
