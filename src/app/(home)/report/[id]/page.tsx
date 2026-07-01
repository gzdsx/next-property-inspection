'use client';

import Link from 'next/link';
import {useRef, useState, useEffect, useMemo} from 'react';
import {useParams, useRouter} from 'next/navigation';
import SignaturePad from '@/components/common/SignaturePad';
import {generateInspectionReport, InspectorProfile} from '@/lib/generateReport';
import {
    FileSignature, ChevronLeft, Share2, Check, Edit2,
    Play, MapPin, FileVideo, ChevronDown, ChevronRight,
    AlertTriangle, Loader2, Pencil, X, Trash2, Plus, Clock, Layers, Camera,
} from 'lucide-react';
import ReactPlayer from 'react-player';
import type {Inspection, InspectionItem} from '@/types';
import {useTranslations} from "@/contexts/LocaleContext";
import {capitalize} from "@/lib/utils";
import {apiPost, apiPut, apiDelete} from "@/lib/api";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {toast} from 'sonner';
import {useInspectionQuery, useUpdateInspectionMutation} from "@/queries/inspection";
import dayjs from "dayjs";
import {useSpinner} from "@/contexts/AppContext";
import {useCreateMaterialMutation} from "@/queries/material";

const CONDITION_STYLE: Record<string, { bg: string; text: string }> = {
    'new item': {bg: 'bg-emerald-500/15', text: 'text-emerald-400'},
    'good': {bg: 'bg-blue-500/15', text: 'text-blue-400'},
    'fair': {bg: 'bg-amber-500/15', text: 'text-amber-400'},
    'poor': {bg: 'bg-red-500/15', text: 'text-red-400'},
    'very poor': {bg: 'bg-red-900/25', text: 'text-red-400'},
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string }> = {
    'low': {bg: 'bg-amber-500/12', text: 'text-amber-500'},
    'medium': {bg: 'bg-orange-500/12', text: 'text-orange-500'},
    'high': {bg: 'bg-red-500/12', text: 'text-red-500'},
};

const ROOM_COLORS = ['#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#06b6d4', '#db2777', '#059669', '#d97706', '#4f46e5'];

function getConditionClass(condition: string) {
    const key = (condition || '').toLowerCase().trim();
    if (key.includes('very poor')) return CONDITION_STYLE['very poor'];
    if (key.includes('poor')) return CONDITION_STYLE['poor'];
    if (key.includes('fair')) return CONDITION_STYLE['fair'];
    if (key.includes('good')) return CONDITION_STYLE['good'];
    if (key.includes('new')) return CONDITION_STYLE['new item'];
    return {bg: 'bg-gray-500/15', text: 'text-gray-400'};
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function imageUrlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve(base64String.split(',')[1] || base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export default function ReportPage() {
    const {t} = useTranslations('inspection');
    const spinner = useSpinner();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const playerRef = useRef<HTMLVideoElement>(null);

    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [items, setItems] = useState<InspectionItem[]>([]);

    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
    const [isSigned, setIsSigned] = useState(false);

    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        item_name: '',
        description: '',
        condition: '',
        severity: '',
        elapsed_seconds: 0
    });
    const [renamingRoom, setRenamingRoom] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const intervalRef = useRef<any>(null);

    const {data: serverData, isFetching, isRefetching, refetch} = useInspectionQuery(id);
    const {mutate: updateInspection} = useUpdateInspectionMutation({
        onMutate: () => {
            spinner.show();
        },
        onSuccess: () => {
            setIsSigned(true);
            if (isCapturing) {
                setIsCapturing(false);
                toast.success('Cover image saved');
            }
        },
        onError: () => {

        },
        onSettled: () => {
            spinner.hide();
        }
    });

    const {mutate: uploadCover} = useCreateMaterialMutation({
        onMutate: () => {
            spinner.show();
        },
        onSuccess: (data: any) => {
            updateInspection({id, data: {image: data.src}} as any);
        },
        onError: () => {
            toast.error('Failed to upload cover image');
        }
    });

    useEffect(() => {
        if (!isFetching && serverData) {
            setInspection(serverData);
            setItems(serverData.items || []);
            setIsSigned(!!serverData.signature);
        }
    }, [isFetching, serverData]);

    useEffect(() => {
        if (serverData.status !== 'completed') {
            intervalRef.current = setInterval(() => {
                refetch();
            }, 5000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [serverData]);

    // ─── Derived ──────────────────────────────────────────────────────────────

    const roomGroups = useMemo(() => {
        const groups = new Map<string, InspectionItem[]>();
        for (const item of items) {
            const room = item.room_name || 'Unknown';
            if (!groups.has(room)) groups.set(room, []);
            groups.get(room)!.push(item);
        }
        return Array.from(groups.entries())
            .map(([name, list]) => ({name, items: list.sort((a, b) => a.elapsed_seconds - b.elapsed_seconds)}))
            .sort((a, b) => (a.items[0]?.elapsed_seconds || 0) - (b.items[0]?.elapsed_seconds || 0));
    }, [items]);

    const conditionStats = useMemo(() => {
        const stats = {good: 0, fair: 0, poor: 0};
        for (const item of items) {
            const c = (item.condition || '').toLowerCase();
            if (c.includes('very poor') || c.includes('poor')) stats.poor++;
            else if (c.includes('fair')) stats.fair++;
            else stats.good++;
        }
        return stats;
    }, [items]);

    const roomSegments = useMemo(() => {
        if (items.length === 0) return [];
        const roomMap: Record<string, { start: number; end: number; good: number; fair: number; poor: number }> = {};
        for (const item of items) {
            const room = item.room_name || 'General';
            const sec = item.elapsed_seconds || 0;
            const c = (item.condition || '').toLowerCase();
            let rate: 'good' | 'fair' | 'poor' = 'good';
            if (c.includes('very poor') || c.includes('poor')) rate = 'poor';
            else if (c.includes('fair')) rate = 'fair';

            if (!roomMap[room]) roomMap[room] = {start: sec, end: sec + 5, good: 0, fair: 0, poor: 0};
            roomMap[room].start = Math.min(roomMap[room].start, sec);
            roomMap[room].end = Math.max(roomMap[room].end, sec + 5);
            roomMap[room][rate]++;
        }
        const segs = Object.entries(roomMap)
            .map(([name, d], idx) => ({
                name,
                start: d.start,
                end: d.end,
                color: ROOM_COLORS[idx % ROOM_COLORS.length],
                goodCount: d.good,
                fairCount: d.fair,
                poorCount: d.poor,
            }))
            .sort((a, b) => a.start - b.start);
        for (let i = 0; i < segs.length - 1; i++) {
            segs[i].end = segs[i + 1].start;
        }
        return segs;
    }, [items]);

    const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
    const [videoDuration, setVideoDuration] = useState(0);

    useEffect(() => {
        const video = playerRef.current;
        if (!video) return;
        const onMeta = () => setVideoDuration(video.duration || 0);
        const onTime = () => {
            const cur = video.currentTime || 0;
            const idx = roomSegments.findIndex(seg => cur >= seg.start && cur <= seg.end);
            if (idx !== -1) setActiveSegmentIndex(idx);
        };
        video.addEventListener('loadedmetadata', onMeta);
        video.addEventListener('timeupdate', onTime);
        return () => {
            video.removeEventListener('loadedmetadata', onMeta);
            video.removeEventListener('timeupdate', onTime);
        };
    }, [roomSegments, inspection?.video_url]);

    useEffect(() => {
        if (roomSegments.length > 0 && videoDuration > 0) {
            roomSegments[roomSegments.length - 1].end = videoDuration;
        }
    }, [videoDuration, roomSegments]);

    useEffect(() => {
        setExpandedRooms(new Set(roomGroups.map(g => g.name)));
    }, [roomGroups]);

    // ─── Item editing ──────────────────────────────────────────────────────────

    const startEditItem = (item: InspectionItem) => {
        setEditingItemId(item.id);
        setEditForm({
            item_name: item.item_name,
            description: item.description || '',
            condition: item.condition,
            severity: item.severity || '',
            elapsed_seconds: item.elapsed_seconds || 0,
        });
    };

    const cancelEditItem = () => {
        setEditingItemId(null);
    };

    const saveEditItem = async () => {
        if (!editingItemId) return;
        try {
            if (editingItemId < 0) {
                const created = await apiPost(`/inspections/${id}/items`, editForm);
                setItems(prev => prev.map(i => i.id === editingItemId ? {...i, ...created} : i));
            } else {
                await apiPut(`/inspections/${id}/items/${editingItemId}`, editForm);
                setItems(prev => prev.map(i => i.id === editingItemId ? {...i, ...editForm} : i));
            }
            setEditingItemId(null);
            toast.success('Item saved');
        } catch (err: any) {
            toast.error(err.message || 'Failed to save item');
        }
    };

    const deleteItem = async (itemId: number) => {
        if (itemId < 0) {
            setItems(prev => prev.filter(i => i.id !== itemId));
            setEditingItemId(null);
            return;
        }
        try {
            await apiDelete(`/inspections/${id}/items/${itemId}`);
            setItems(prev => prev.filter(i => i.id !== itemId));
            toast.success('Item deleted');
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete item');
        }
    };

    const addItem = (roomName: string) => {
        const elapsed = playerRef.current ? Math.round(playerRef.current.currentTime) : 0;
        const tempId = -Date.now();
        const newItem: InspectionItem = {
            id: tempId,
            video_id: 0,
            room_name: roomName,
            item_name: 'New Item',
            description: '',
            condition: 'Good',
            severity: '',
            elapsed_seconds: elapsed,
            image: '',
            created_at: '',
            updated_at: '',
        };
        setItems(prev => [...prev, newItem]);
        startEditItem(newItem);
    };

    // ─── Room rename ──────────────────────────────────────────────────────────

    const openRenameRoom = (roomName: string) => {
        setRenamingRoom(roomName);
        setRenameValue(roomName);
    };

    const handleRenameRoom = async () => {
        if (!renamingRoom || !renameValue.trim() || renameValue === renamingRoom) {
            setRenamingRoom(null);
            return;
        }
        setIsRenaming(true);
        try {
            await apiPost(`/inspections/${id}/items/rename-room`, {
                old_name: renamingRoom,
                new_name: renameValue.trim(),
            });
            setItems(prev => prev.map(i =>
                i.room_name === renamingRoom ? {...i, room_name: renameValue.trim()} : i
            ));
            setExpandedRooms(prev => {
                const next = new Set(prev);
                if (next.has(renamingRoom)) {
                    next.delete(renamingRoom);
                    next.add(renameValue.trim());
                }
                return next;
            });
            setRenamingRoom(null);
            toast.success('Room renamed');
        } catch (err: any) {
            toast.error(err.message || 'Failed to rename room');
        } finally {
            setIsRenaming(false);
        }
    };

    // ─── Capture cover ─────────────────────────────────────────────────────────

    const [isCapturing, setIsCapturing] = useState(false);

    const handleCaptureCover = () => {
        const video = playerRef.current;
        if (!video) return;

        setIsCapturing(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (!blob) {
                    toast.error('Failed to capture screenshot');
                    setIsCapturing(false);
                    return;
                }
                const formData = new FormData();
                formData.append('file', blob, `cover_${id}_${Date.now()}.jpg`);
                uploadCover(formData as any);
            }, 'image/jpeg', 0.85);
        } catch (err: any) {
            toast.error(err.message || 'Failed to capture cover');
            setIsCapturing(false);
        }
    };

    // ─── Actions ──────────────────────────────────────────────────────────────

    const handleSeekItem = (seconds: number) => {
        if (playerRef.current) {
            playerRef.current.currentTime = seconds;
            playerRef.current.play().catch(() => {
            });
        }
    };

    const toggleRoom = (roomName: string) => {
        setExpandedRooms(prev => {
            const next = new Set(prev);
            if (next.has(roomName)) next.delete(roomName);
            else next.add(roomName);
            return next;
        });
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/shared/${id}`;
        navigator.clipboard.writeText(shareUrl).catch(() => alert('Failed to copy link'));
    };

    const handleSignatureSaved = async (sigBase64: string) => {
        setShowSignaturePad(false);
        setSignatureBase64(sigBase64);
        updateInspection({id, data: {signatureData: sigBase64}} as any);
    };

    const handleGeneratePDF = async () => {
        setIsGenerating(true);
        const property = inspection?.property;
        const user = inspection?.user;
        const profile: InspectorProfile = {
            companyName: user?.company_name || 'Real Estate Agency',
            inspectorName: user?.name || 'Inspector',
            phone: user?.phone_number || '',
            email: user?.email || '',
            reference: user?.reference || String(id),
        };
        const now = new Date();
        const day = now.getDate();
        const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
        const dateStr = `${now.toLocaleString('en-GB', {month: 'long'})} ${day}${suffix} ${now.getFullYear()}`;

        try {
            let coverBase64: string | undefined;
            if (property?.image) {
                try {
                    const src = property.image.startsWith('http') || property.image.startsWith('/')
                        ? property.image : `/uploads/${property.image}`;
                    coverBase64 = await imageUrlToBase64(src);
                } catch {
                }
            }
            generateInspectionReport({
                address: property?.name || 'Inspection Report',
                date: dateStr,
                records: items.map(item => ({
                    id: String(item.id),
                    room_name: item.room_name,
                    item_name: item.item_name,
                    description: item.description,
                    condition: item.condition,
                    severity: item.severity,
                    elapsedSeconds: item.elapsed_seconds,
                })),
                inspector: profile,
                coverPhotoBase64: coverBase64,
                tenantSignatureBase64: signatureBase64 || undefined,
            });
        } catch {
            alert('Failed to generate report.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReanalyze = () => {
        spinner.show();
        apiPost(`/inspections/${id}/analyze`).then(response => {
            refetch();
        }).finally(() => {
            spinner.hide();
        });
    }

    // ─── Loading ──────────────────────────────────────────────────────────────

    if ((isFetching && !isRefetching) || !inspection) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500"/>
            </div>
        );
    }

    const property = inspection.property || {};

    return (
        <>
            <div className="main-viewport flex-row!">
                {/* ── Left: Video Player ──────────────────────────────────── */}
                <section className="flex flex-col flex-[1.4] p-6 overflow-y-auto border-r border-white/8">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-5">
                        <Link href={`/property/${property.id}`}
                              className="flex items-center gap-2 text-foreground no-underline font-bold text-sm">
                            <ChevronLeft size={20}/>
                            Back to Property
                        </Link>
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => router.push(`/report/${id}/edit`)}
                                className="glass-panel flex items-center gap-2 px-4 py-2.5 cursor-pointer font-bold text-sm text-foreground"
                            >
                                <Edit2 size={16}/>
                                Edit
                            </button>
                            <button
                                onClick={handleShare}
                                className="glass-panel flex items-center gap-2 px-4 py-2.5 cursor-pointer font-bold text-sm text-foreground"
                            >
                                <Share2 size={16}/>
                                Share
                            </button>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="mb-4">
                        <h2 className="text-xl font-black flex items-center gap-2 text-foreground tracking-tight">
                            <MapPin size={20} className="text-blue-500"/>
                            {property?.name || 'Inspection Report'}
                        </h2>
                        <div className="flex items-center gap-4 pl-7 mt-2">
                            <span className="text-xs text-gray-400">
                                {t(`type_${inspection?.type}`)} · {dayjs(inspection.created_at).format('MMM DD, YYYY')}
                            </span>
                            <span
                                className={inspection?.status === 'completed' ? 'badge badge-success' : 'badge badge-warning'}>
                                {capitalize(inspection?.status || '')}
                            </span>
                            {
                                inspection?.status === 'failed' && (
                                    <span className={'badge badge-success cursor-pointer'}
                                          onClick={handleReanalyze}>Reanalyze</span>
                                )
                            }
                        </div>
                    </div>

                    {/* 16:9 Video Player */}
                    <div
                        className="group/video relative w-full pb-[56.25%] rounded-sm overflow-hidden bg-black shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        {inspection?.video_status === 'transcoded' || inspection?.video_status === 'uploded' ? (
                            <>
                                <ReactPlayer
                                    ref={playerRef}
                                    src={inspection.video_url}
                                    controls
                                    crossOrigin="anonymous"
                                    width="100%"
                                    height="100%"
                                    className="absolute inset-0"
                                />
                                <button
                                    onClick={handleCaptureCover}
                                    disabled={isCapturing}
                                    className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-semibold border-none cursor-pointer opacity-0 group-hover/video:opacity-100 transition-opacity hover:bg-black/80 disabled:opacity-50"
                                >
                                    {isCapturing
                                        ? <Loader2 size={13} className="animate-spin"/>
                                        : <Camera size={13}/>
                                    }
                                    Save as Cover
                                </button>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-(--text-muted)">
                                {
                                    inspection.video_url ? (
                                        <span>The video is currently being transcoded, please wait.</span>
                                    ) : (
                                        <span>No video uploaded</span>
                                    )
                                }
                            </div>
                        )}
                    </div>

                    {/* Room Segments Timeline */}
                    {roomSegments.length > 0 && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-(--text-muted)">
                                    <Layers size={14}/> Room Segments Timeline
                                </span>
                            </div>

                            {/* Segment bar */}
                            <div className="timeline-track">
                                {roomSegments.map((seg, idx) => {
                                    const total = videoDuration || 1;
                                    const widthPct = ((seg.end - seg.start) / total) * 100;
                                    return (
                                        <div
                                            key={idx}
                                            className={`timeline-segment ${activeSegmentIndex === idx ? 'active' : ''}`}
                                            style={{width: `${widthPct}%`, backgroundColor: seg.color}}
                                            onClick={() => {
                                                if (playerRef.current) {
                                                    playerRef.current.currentTime = seg.start;
                                                    playerRef.current.play().catch(() => {
                                                    });
                                                    setActiveSegmentIndex(idx);
                                                }
                                            }}
                                            title={`${seg.name} (${formatTime(seg.start)} – ${formatTime(seg.end)})`}
                                        >
                                            {widthPct > 8 && <span className="text-[0.6rem] truncate">{seg.name}</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Active room items - horizontal card scroll */}
                            {(() => {
                                const activeSeg = activeSegmentIndex !== null ? roomSegments[activeSegmentIndex] : null;
                                if (!activeSeg) return null;
                                const activeRoomItems = [...items]
                                    .filter(i => (i.room_name || 'General') === activeSeg.name)
                                    .sort((a, b) => a.elapsed_seconds - b.elapsed_seconds);
                                if (activeRoomItems.length === 0) return null;

                                return (
                                    <div className="mt-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full shrink-0"
                                                  style={{backgroundColor: activeSeg.color}}/>
                                            <span className="text-xs font-bold" style={{color: activeSeg.color}}>
                                                {activeSeg.name}
                                            </span>
                                            <span className="text-[0.65rem] text-(--text-muted)">
                                                {activeRoomItems.length} item{activeRoomItems.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="flex gap-2.5 overflow-x-auto pb-2"
                                             style={{scrollbarWidth: 'thin'}}>
                                            {activeRoomItems.map(item => {
                                                const cs = getConditionClass(item.condition);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => handleSeekItem(item.elapsed_seconds)}
                                                        className="glass-panel shrink-0 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white/[0.04] transition-all flex flex-col items-center gap-1.5 text-center"
                                                        style={{width: '140px'}}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <Play size={8}
                                                                  className="fill-blue-400 text-blue-400 shrink-0"/>
                                                            <span
                                                                className="font-mono text-[0.65rem] font-bold text-blue-400">
                                                                {formatTime(item.elapsed_seconds)}
                                                            </span>
                                                        </div>
                                                        <span
                                                            className="text-[0.75rem] font-semibold text-foreground leading-tight truncate w-full">
                                                            {item.item_name}
                                                        </span>
                                                        <span
                                                            className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${cs.bg} ${cs.text}`}>
                                                            {item.condition}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </section>

                {/* ── Right: Inspection Items ─────────────────────────────── */}
                <section className="flex flex-col flex-1 p-6 overflow-y-auto bg-white/1.5">
                    <div className="mb-5">
                        <h2 className="text-xl font-black tracking-tight">Inspection Items</h2>
                        <p className="text-xs text-(--text-muted) mt-1">
                            {items.length} items in {roomGroups.length} room{roomGroups.length !== 1 ? 's' : ''}
                        </p>

                        {items.length > 0 && (
                            <div className="flex gap-2 mt-3">
                                {conditionStats.good > 0 && (
                                    <span
                                        className="text-[0.7rem] font-bold px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400">
                                        {conditionStats.good} Good
                                    </span>
                                )}
                                {conditionStats.fair > 0 && (
                                    <span
                                        className="text-[0.7rem] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400">
                                        {conditionStats.fair} Fair
                                    </span>
                                )}
                                {conditionStats.poor > 0 && (
                                    <span
                                        className="text-[0.7rem] font-bold px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400">
                                        {conditionStats.poor} Poor
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Room groups */}
                    <div className="flex-1 flex flex-col gap-3 pb-5">
                        {roomGroups.length === 0 && (
                            <div className="glass-panel p-10 text-center text-(--text-muted)">
                                <FileVideo size={32} className="mx-auto mb-3 opacity-40"/>
                                <p className="text-sm font-bold">No inspection items yet</p>
                                <p className="text-xs mt-1">Upload videos and run AI analysis to extract room items</p>
                            </div>
                        )}

                        {roomGroups.map((group, groupIdx) => {
                            const isExpanded = expandedRooms.has(group.name);
                            const roomColor = ROOM_COLORS[groupIdx % ROOM_COLORS.length];
                            const issueCount = group.items.filter(i => i.severity && i.severity.toLowerCase() !== '').length;

                            return (
                                <div key={group.name} className="glass-panel overflow-hidden">
                                    <div
                                        className="flex items-center gap-2.5 px-4 py-3.5"
                                        style={{borderLeft: `4px solid ${roomColor}`}}
                                    >
                                        <div
                                            onClick={() => toggleRoom(group.name)}
                                            className="group/room flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                                        >
                                            {isExpanded
                                                ? <ChevronDown size={16} className="text-(--text-muted) shrink-0"/>
                                                : <ChevronRight size={16} className="text-(--text-muted) shrink-0"/>
                                            }
                                            <span className="flex-1 font-bold text-[0.95rem]">{group.name}</span>
                                            <span className="text-[0.7rem] text-(--text-muted) font-semibold">
                                                {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                                            </span>
                                            {issueCount > 0 && (
                                                <span
                                                    className="flex items-center gap-1 text-[0.65rem] font-bold px-2 py-0.5 rounded-md bg-red-500/12 text-red-500">
                                                    <AlertTriangle size={10}/>{issueCount}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => addItem(group.name)}
                                            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-white/5 border-none text-(--text-muted) cursor-pointer hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                            title="Add item to this room"
                                        >
                                            <Plus size={14}/>
                                        </button>
                                        <button
                                            onClick={() => openRenameRoom(group.name)}
                                            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-white/5 border-none text-(--text-muted) cursor-pointer hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                            title="Rename room"
                                        >
                                            <Pencil size={12}/>
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-white/8">
                                            {group.items.map(item => {
                                                const isEditing = editingItemId === item.id;
                                                const cs = getConditionClass(isEditing ? editForm.condition : item.condition);
                                                const sv = (isEditing ? editForm.severity : item.severity)
                                                    ? SEVERITY_STYLE[(isEditing ? editForm.severity : item.severity).toLowerCase()]
                                                    : null;

                                                if (isEditing) {
                                                    return (
                                                        <div key={item.id}
                                                             className="flex flex-col gap-2.5 py-3 px-4 pl-7.5 border-b border-white/8 bg-white/[0.03]">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <button
                                                                        onClick={() => handleSeekItem(editForm.elapsed_seconds)}
                                                                        className="flex items-center justify-center w-6 h-7 rounded-l-lg bg-blue-500/15 text-blue-400 border-none cursor-pointer"
                                                                        title="Seek to this time"
                                                                    >
                                                                        <Play size={9} className="fill-blue-400"/>
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        step={1}
                                                                        value={editForm.elapsed_seconds}
                                                                        onChange={e => setEditForm(f => ({
                                                                            ...f,
                                                                            elapsed_seconds: Math.max(0, parseInt(e.target.value) || 0)
                                                                        }))}
                                                                        className="w-16 px-1.5 py-1 text-center font-mono text-[0.7rem] font-bold rounded-r-lg bg-white/5 border border-white/10 text-blue-400 outline-none"
                                                                    />
                                                                    <span
                                                                        className="text-[0.6rem] text-[var(--text-muted)]">sec</span>
                                                                </div>
                                                                <input
                                                                    value={editForm.item_name}
                                                                    onChange={e => setEditForm(f => ({
                                                                        ...f,
                                                                        item_name: e.target.value
                                                                    }))}
                                                                    className="flex-1 px-2.5 py-1.5 text-sm font-bold rounded-lg bg-white/5 border border-white/10 text-[var(--foreground)] outline-none"
                                                                    placeholder="Item name"
                                                                />
                                                            </div>
                                                            <input
                                                                value={editForm.description}
                                                                onChange={e => setEditForm(f => ({
                                                                    ...f,
                                                                    description: e.target.value
                                                                }))}
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-[var(--foreground)] outline-none"
                                                                placeholder="Description"
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <Select
                                                                    value={editForm.condition}
                                                                    onValueChange={v => setEditForm(f => ({
                                                                        ...f,
                                                                        condition: v
                                                                    }))}
                                                                >
                                                                    <SelectTrigger size="sm" className="flex-1 text-xs">
                                                                        <SelectValue/>
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="New Item">New
                                                                            Item</SelectItem>
                                                                        <SelectItem value="Good">Good</SelectItem>
                                                                        <SelectItem value="Fair">Fair</SelectItem>
                                                                        <SelectItem value="Poor">Poor</SelectItem>
                                                                        <SelectItem value="Very Poor">Very
                                                                            Poor</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <Select
                                                                    value={editForm.severity || '_none'}
                                                                    onValueChange={v => setEditForm(f => ({
                                                                        ...f,
                                                                        severity: v === '_none' ? '' : v
                                                                    }))}
                                                                >
                                                                    <SelectTrigger size="sm" className="flex-1 text-xs">
                                                                        <SelectValue/>
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="_none">No Issue</SelectItem>
                                                                        <SelectItem value="Low">Low</SelectItem>
                                                                        <SelectItem value="Medium">Medium</SelectItem>
                                                                        <SelectItem value="High">High</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => deleteItem(item.id)}
                                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 border-none cursor-pointer mr-auto"
                                                                >
                                                                    <Trash2 size={12}/> Delete
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditItem}
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 text-[var(--text-muted)] border border-white/10 cursor-pointer"
                                                                >
                                                                    <X size={12}/> Cancel
                                                                </button>
                                                                <button
                                                                    onClick={saveEditItem}
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-500 text-white border-none cursor-pointer"
                                                                >
                                                                    <Check size={12}/> Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="group flex items-center gap-3 py-2.5 px-4 pl-7.5 border-b border-white/8 text-[0.85rem] hover:bg-white/[0.02] transition-colors"
                                                    >
                                                        <button
                                                            onClick={() => handleSeekItem(item.elapsed_seconds)}
                                                            className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-mono text-[0.7rem] font-bold border-none cursor-pointer"
                                                        >
                                                            <Play size={9} className="fill-blue-400"/>
                                                            {formatTime(item.elapsed_seconds)}
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <span
                                                                className="font-bold text-foreground">{item.item_name}</span>
                                                            {item.description && (
                                                                <span
                                                                    className="text-(--text-muted) ml-2 text-xs">{item.description}</span>
                                                            )}
                                                        </div>
                                                        {sv && (
                                                            <span
                                                                className={`shrink-0 text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${sv.bg} ${sv.text}`}>
                                                                {item.severity}
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`shrink-0 text-[0.7rem] font-bold px-2.5 py-1 rounded-lg ${cs.bg} ${cs.text}`}>
                                                            {item.condition}
                                                        </span>
                                                        <button
                                                            onClick={() => startEditItem(item)}
                                                            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 border-none text-[var(--text-muted)] cursor-pointer hover:text-blue-400"
                                                        >
                                                            <Pencil size={12}/>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom actions */}
                    <div className="flex gap-3 pt-5 border-t border-white/8">
                        <button
                            onClick={() => {
                                if (!isSigned) setShowSignaturePad(true);
                            }}
                            disabled={isGenerating}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[0.95rem] font-bold transition-all
                                ${isSigned
                                ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/30 cursor-default'
                                : 'bg-(--panel-bg) text-foreground border border-white/8 cursor-pointer'
                            }`}
                        >
                            {isSigned ? <><Check size={16}/> Signed</> : <><FileSignature size={16}/> Sign Report</>}
                        </button>
                        <button
                            onClick={handleGeneratePDF}
                            disabled={isGenerating || items.length === 0}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[0.95rem] font-bold text-white bg-indigo-500 border-none cursor-pointer shadow-[0_6px_20px_rgba(99,102,241,0.2)] disabled:opacity-40"
                        >
                            {isGenerating
                                ? <><Loader2 size={14} className="animate-spin"/> Generating...</>
                                : <><Play size={14} className="fill-white"/> Generate PDF</>
                            }
                        </button>
                    </div>
                </section>
            </div>

            {/* Rename Room Dialog */}
            <Dialog open={!!renamingRoom} onOpenChange={open => {
                if (!open) setRenamingRoom(null);
            }}>
                <DialogContent className="sm:max-w-sm" style={{
                    background: 'var(--background)',
                    border: '1px solid var(--panel-border)',
                    overflow: 'hidden'
                }}>
                    <DialogHeader>
                        <DialogTitle>Rename Room</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <input
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameRoom();
                            }}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-[var(--foreground)] outline-none"
                            placeholder="Room name"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenamingRoom(null)}>Cancel</Button>
                        <Button onClick={handleRenameRoom} disabled={isRenaming || !renameValue.trim()}>
                            {isRenaming ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : null}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showSignaturePad && (
                <SignaturePad
                    label="Tenant Signature"
                    onSave={handleSignatureSaved}
                    onClose={() => setShowSignaturePad(false)}
                />
            )}
        </>
    );
}
