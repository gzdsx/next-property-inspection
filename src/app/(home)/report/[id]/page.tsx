'use client';

import {useRef, useState, useEffect, useMemo} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Link from 'next/link';
import SignaturePad from '@/components/common/SignaturePad';
import {generateInspectionReport, InspectorProfile} from '@/lib/generateReport';
import {
    FileSignature, ChevronLeft, Share2, Layers, Check, Edit2,
    Play, MapPin, FileVideo, ChevronDown, ChevronRight, Clock,
    AlertTriangle, Loader2,
} from 'lucide-react';
import {apiGet} from '@/lib/api';
import type {Inspection, InspectionVideo, InsoectionItem} from '@/types';

const CONDITION_STYLE: Record<string, { bg: string; color: string }> = {
    'new item': {bg: 'rgba(16,185,129,0.15)', color: '#10b981'},
    'good': {bg: 'rgba(59,130,246,0.15)', color: '#3b82f6'},
    'fair': {bg: 'rgba(245,158,11,0.15)', color: '#f59e0b'},
    'poor': {bg: 'rgba(239,68,68,0.15)', color: '#ef4444'},
    'very poor': {bg: 'rgba(127,29,29,0.25)', color: '#f87171'},
};

const SEVERITY_STYLE: Record<string, { bg: string; color: string }> = {
    'low': {bg: 'rgba(245,158,11,0.12)', color: '#f59e0b'},
    'medium': {bg: 'rgba(249,115,22,0.12)', color: '#f97316'},
    'high': {bg: 'rgba(239,68,68,0.12)', color: '#ef4444'},
};

const ROOM_COLORS = ['#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#06b6d4', '#db2777', '#059669', '#d97706', '#4f46e5'];

function getConditionStyle(condition: string) {
    const key = (condition || '').toLowerCase().trim();
    if (key.includes('very poor')) return CONDITION_STYLE['very poor'];
    if (key.includes('poor')) return CONDITION_STYLE['poor'];
    if (key.includes('fair')) return CONDITION_STYLE['fair'];
    if (key.includes('good')) return CONDITION_STYLE['good'];
    if (key.includes('new')) return CONDITION_STYLE['new item'];
    return {bg: 'rgba(156,163,175,0.15)', color: '#9ca3af'};
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
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const videoRef = useRef<HTMLVideoElement>(null);

    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [videos, setVideos] = useState<(InspectionVideo & { items?: InsoectionItem[] })[]>([]);
    const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
    const [isSigned, setIsSigned] = useState(false);

    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // ─── Fetch ────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const data = await apiGet(`/inspections/${id}`);
                setInspection(data);
                const vids = data.videos || [];
                setVideos(vids);
                if (vids.length > 0) {
                    setActiveVideoId(vids[0].id);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id]);

    // ─── Derived state ────────────────────────────────────────────────────────

    const activeVideo = useMemo(() =>
            videos.find(v => v.id === activeVideoId) || null,
        [videos, activeVideoId]
    );

    const activeItems: InsoectionItem[] = useMemo(() =>
            activeVideo?.items || [],
        [activeVideo]
    );

    const roomGroups = useMemo(() => {
        const groups = new Map<string, InsoectionItem[]>();
        for (const item of activeItems) {
            const room = item.room_name || 'Unknown';
            if (!groups.has(room)) groups.set(room, []);
            groups.get(room)!.push(item);
        }
        return Array.from(groups.entries())
            .map(([name, items]) => ({name, items: items.sort((a, b) => a.elapsed_seconds - b.elapsed_seconds)}))
            .sort((a, b) => {
                const aMin = a.items[0]?.elapsed_seconds || 0;
                const bMin = b.items[0]?.elapsed_seconds || 0;
                return aMin - bMin;
            });
    }, [activeItems]);

    const allItems: InsoectionItem[] = useMemo(() =>
            videos.flatMap(v => v.items || []),
        [videos]
    );

    // Auto-expand all rooms on video change
    useEffect(() => {
        setExpandedRooms(new Set(roomGroups.map(g => g.name)));
    }, [activeVideoId]);

    // ─── Video switching ──────────────────────────────────────────────────────

    const handleSelectVideo = (videoId: number) => {
        setActiveVideoId(videoId);
        if (videoRef.current) {
            videoRef.current.load();
        }
    };

    // ─── Seek to item timestamp ───────────────────────────────────────────────

    const handleSeekItem = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds;
            videoRef.current.play().catch(() => {});
        }
    };

    // ─── Room expand/collapse ─────────────────────────────────────────────────

    const toggleRoom = (roomName: string) => {
        setExpandedRooms(prev => {
            const next = new Set(prev);
            if (next.has(roomName)) next.delete(roomName);
            else next.add(roomName);
            return next;
        });
    };

    // ─── Toast / Share ────────────────────────────────────────────────────────

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/shared/${id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            triggerToast('Share link copied to clipboard');
        }).catch(() => alert('Failed to copy link'));
    };

    // ─── Signature ────────────────────────────────────────────────────────────

    const handleSignatureSaved = async (sigBase64: string) => {
        setShowSignaturePad(false);
        setSignatureBase64(sigBase64);
        setIsSigned(true);
        try {
            await fetch(`/api/reports/${id}/sign`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({signature: sigBase64}),
            });
            triggerToast('Report signed successfully!');
        } catch {
            alert('Failed to save signature.');
        }
    };

    // ─── PDF generation ───────────────────────────────────────────────────────

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
                } catch {}
            }

            generateInspectionReport({
                address: property?.name || 'Inspection Report',
                date: dateStr,
                records: allItems.map(item => ({
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
            triggerToast('PDF generated successfully!');
        } catch {
            alert('Failed to generate report.');
        } finally {
            setIsGenerating(false);
        }
    };

    // ─── Condition stats ──────────────────────────────────────────────────────

    const conditionStats = useMemo(() => {
        const stats = {good: 0, fair: 0, poor: 0};
        for (const item of activeItems) {
            const c = (item.condition || '').toLowerCase();
            if (c.includes('very poor') || c.includes('poor')) stats.poor++;
            else if (c.includes('fair')) stats.fair++;
            else stats.good++;
        }
        return stats;
    }, [activeItems]);

    // ─── Loading / Error ──────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{color: 'var(--primary)'}}/>
            </div>
        );
    }

    const property = inspection?.property;

    return (
        <>
            <div className="main-viewport" style={{flexDirection: 'row'}}>
                {/* ── Left: Video Player + Video List ─────────────────────── */}
                <section style={{
                    flex: 1.4,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px',
                    overflowY: 'auto',
                    borderRight: '1px solid var(--panel-border)',
                }}>
                    {/* Header */}
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                        <Link href="/" style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            color: 'var(--foreground)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem',
                        }}>
                            <ChevronLeft size={20}/>
                            Back to Dashboard
                        </Link>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button
                                onClick={() => router.push(`/report/${id}/edit`)}
                                className="glass-panel flex items-center gap-2 px-4 py-2.5 cursor-pointer font-bold text-sm"
                                style={{color: 'var(--foreground)'}}
                            >
                                <Edit2 size={16}/>
                                Edit
                            </button>
                            <button
                                onClick={handleShare}
                                className="glass-panel flex items-center gap-2 px-4 py-2.5 cursor-pointer font-bold text-sm"
                                style={{color: 'var(--foreground)'}}
                            >
                                <Share2 size={16}/>
                                Share
                            </button>
                        </div>
                    </div>

                    {/* Address */}
                    <div style={{marginBottom: '16px'}}>
                        <h2 style={{
                            fontSize: '1.35rem', fontWeight: '900', display: 'flex',
                            alignItems: 'center', gap: '8px', color: 'var(--foreground)', letterSpacing: '-0.3px',
                        }}>
                            <MapPin size={20} style={{color: 'var(--primary)'}}/>
                            {property?.name || 'Inspection Report'}
                        </h2>
                        {inspection?.type && (
                            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '28px'}}>
                                {inspection.type} · {new Date(inspection.created_at).toLocaleDateString()}
                            </p>
                        )}
                    </div>

                    {/* Video Player */}
                    <div className="glass-panel" style={{
                        overflow: 'hidden', position: 'relative', background: 'black',
                        borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}>
                        {activeVideo ? (
                            <video
                                ref={videoRef}
                                style={{width: '100%', maxHeight: '420px', display: 'block'}}
                                controls
                                preload="auto"
                                src={activeVideo.src}
                            />
                        ) : (
                            <div style={{
                                width: '100%', height: '240px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
                            }}>
                                No videos available
                            </div>
                        )}
                    </div>

                    {/* Video Selector List */}
                    {videos.length > 0 && (
                        <div style={{marginTop: '16px'}}>
                            <h3 style={{
                                fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)',
                                marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                                <Layers size={14}/>
                                Walkthrough Videos ({videos.length})
                            </h3>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                {videos.map((video, idx) => {
                                    const isActive = video.id === activeVideoId;
                                    const itemCount = video.items?.length || 0;
                                    return (
                                        <div
                                            key={video.id}
                                            onClick={() => handleSelectVideo(video.id)}
                                            className="glass-panel"
                                            style={{
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                                                background: isActive ? 'var(--primary-bg)' : undefined,
                                                transition: 'var(--transition)',
                                            }}
                                        >
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                backgroundColor: isActive ? 'var(--primary-bg)' : 'rgba(255,255,255,0.05)',
                                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                                flexShrink: 0,
                                            }}>
                                                {isActive
                                                    ? <Play size={16} style={{fill: 'var(--primary)'}}/>
                                                    : <FileVideo size={16}/>
                                                }
                                            </div>
                                            <div style={{flex: 1, minWidth: 0}}>
                                                <p style={{
                                                    margin: 0, fontSize: '0.85rem', fontWeight: 'bold',
                                                    color: isActive ? 'var(--primary)' : 'var(--foreground)',
                                                }} className="truncate">
                                                    {video.src?.split('/').pop() || `Video ${idx + 1}`}
                                                </p>
                                                <p style={{margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px'}}>
                                                    {video.mime_type} · {itemCount} item{itemCount !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            {isActive && (
                                                <span style={{
                                                    fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--primary)',
                                                    backgroundColor: 'var(--primary-bg)', padding: '3px 8px',
                                                    borderRadius: '6px',
                                                }}>
                                                    NOW PLAYING
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>

                {/* ── Right: Inspection Items by Room ─────────────────────── */}
                <section style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px',
                    overflowY: 'auto',
                    background: 'rgba(10,15,26,0.15)',
                }}>
                    {/* Items header */}
                    <div style={{marginBottom: '20px'}}>
                        <h2 style={{fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.4px'}}>
                            Inspection Items
                        </h2>
                        <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px'}}>
                            {activeItems.length} items in {roomGroups.length} room{roomGroups.length !== 1 ? 's' : ''}
                            {activeVideo && ` · ${activeVideo.src?.split('/').pop() || 'Video'}`}
                        </p>

                        {/* Condition stats bar */}
                        {activeItems.length > 0 && (
                            <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
                                {conditionStats.good > 0 && (
                                    <span style={{
                                        fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 10px',
                                        borderRadius: '8px', ...getConditionStyle('good'),
                                        backgroundColor: getConditionStyle('good').bg,
                                    }}>
                                        {conditionStats.good} Good
                                    </span>
                                )}
                                {conditionStats.fair > 0 && (
                                    <span style={{
                                        fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 10px',
                                        borderRadius: '8px', ...getConditionStyle('fair'),
                                        backgroundColor: getConditionStyle('fair').bg,
                                    }}>
                                        {conditionStats.fair} Fair
                                    </span>
                                )}
                                {conditionStats.poor > 0 && (
                                    <span style={{
                                        fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 10px',
                                        borderRadius: '8px', ...getConditionStyle('poor'),
                                        backgroundColor: getConditionStyle('poor').bg,
                                    }}>
                                        {conditionStats.poor} Poor
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Room groups */}
                    <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px'}}>
                        {roomGroups.length === 0 && (
                            <div className="glass-panel" style={{
                                padding: '40px', textAlign: 'center', color: 'var(--text-muted)',
                            }}>
                                <FileVideo size={32} style={{margin: '0 auto 12px', opacity: 0.4}}/>
                                <p style={{fontSize: '0.9rem', fontWeight: 'bold'}}>No inspection items yet</p>
                                <p style={{fontSize: '0.75rem', marginTop: '4px'}}>
                                    Upload videos and run AI analysis to extract room items
                                </p>
                            </div>
                        )}

                        {roomGroups.map((group, groupIdx) => {
                            const isExpanded = expandedRooms.has(group.name);
                            const roomColor = ROOM_COLORS[groupIdx % ROOM_COLORS.length];
                            const issueCount = group.items.filter(i => i.severity && i.severity.toLowerCase() !== '').length;

                            return (
                                <div key={group.name} className="glass-panel" style={{overflow: 'hidden'}}>
                                    {/* Room header */}
                                    <div
                                        onClick={() => toggleRoom(group.name)}
                                        style={{
                                            padding: '14px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            borderLeft: `4px solid ${roomColor}`,
                                        }}
                                    >
                                        {isExpanded
                                            ? <ChevronDown size={16} style={{color: 'var(--text-muted)', flexShrink: 0}}/>
                                            : <ChevronRight size={16} style={{color: 'var(--text-muted)', flexShrink: 0}}/>
                                        }
                                        <span style={{flex: 1, fontWeight: 'bold', fontSize: '0.95rem'}}>
                                            {group.name}
                                        </span>
                                        <span style={{
                                            fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600',
                                        }}>
                                            {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                                        </span>
                                        {issueCount > 0 && (
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px',
                                                borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px',
                                                backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444',
                                            }}>
                                                <AlertTriangle size={10}/>
                                                {issueCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Items table */}
                                    {isExpanded && (
                                        <div style={{borderTop: '1px solid var(--panel-border)'}}>
                                            {group.items.map(item => {
                                                const cs = getConditionStyle(item.condition);
                                                const sv = item.severity ? SEVERITY_STYLE[item.severity.toLowerCase()] : null;

                                                return (
                                                    <div
                                                        key={item.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '10px 16px 10px 30px',
                                                            borderBottom: '1px solid var(--panel-border)',
                                                            fontSize: '0.85rem',
                                                            transition: 'background 0.15s',
                                                        }}
                                                        className="hover-row"
                                                    >
                                                        {/* Timestamp button */}
                                                        <button
                                                            onClick={() => handleSeekItem(item.elapsed_seconds)}
                                                            style={{
                                                                background: 'var(--primary-bg)',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                padding: '4px 8px',
                                                                color: 'var(--primary)',
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                flexShrink: 0,
                                                            }}
                                                            title="Seek to this timestamp"
                                                        >
                                                            <Play size={9} style={{fill: 'var(--primary)'}}/>
                                                            {formatTime(item.elapsed_seconds)}
                                                        </button>

                                                        {/* Item name + description */}
                                                        <div style={{flex: 1, minWidth: 0}}>
                                                            <span style={{fontWeight: 'bold', color: 'var(--foreground)'}}>
                                                                {item.item_name}
                                                            </span>
                                                            {item.description && (
                                                                <span style={{
                                                                    color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.75rem',
                                                                }} className="truncate">
                                                                    {item.description}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Severity */}
                                                        {sv && (
                                                            <span style={{
                                                                fontSize: '0.65rem', fontWeight: 'bold',
                                                                padding: '2px 8px', borderRadius: '6px',
                                                                backgroundColor: sv.bg, color: sv.color,
                                                                flexShrink: 0,
                                                            }}>
                                                                {item.severity}
                                                            </span>
                                                        )}

                                                        {/* Condition badge */}
                                                        <span style={{
                                                            fontSize: '0.7rem', fontWeight: 'bold',
                                                            padding: '3px 10px', borderRadius: '8px',
                                                            backgroundColor: cs.bg, color: cs.color,
                                                            flexShrink: 0,
                                                        }}>
                                                            {item.condition}
                                                        </span>
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
                    <div style={{
                        borderTop: '1px solid var(--panel-border)',
                        paddingTop: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }}>
                        <div style={{display: 'flex', gap: '12px', width: '100%'}}>
                            <button
                                onClick={() => { if (!isSigned) setShowSignaturePad(true); }}
                                disabled={isGenerating}
                                style={{
                                    flex: 1, padding: '14px',
                                    backgroundColor: isSigned ? 'rgba(16,185,129,0.12)' : 'var(--panel-bg)',
                                    color: isSigned ? '#10b981' : 'var(--foreground)',
                                    border: isSigned ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--panel-border)',
                                    borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold',
                                    cursor: isSigned ? 'default' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'var(--transition)',
                                }}
                            >
                                {isSigned ? <><Check size={16}/> Signed</> : <><FileSignature size={16}/> Sign Report</>}
                            </button>

                            <button
                                onClick={handleGeneratePDF}
                                disabled={isGenerating || allItems.length === 0}
                                style={{
                                    flex: 1, padding: '14px', backgroundColor: 'var(--accent)', color: 'white',
                                    border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: '8px', transition: 'var(--transition)',
                                    boxShadow: '0 6px 20px rgba(99,102,241,0.2)',
                                    opacity: allItems.length === 0 ? 0.4 : 1,
                                }}
                            >
                                {isGenerating
                                    ? <><Loader2 size={14} className="animate-spin"/> Generating...</>
                                    : <><Play size={14} style={{fill: 'white'}}/> Generate PDF</>
                                }
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* Toast */}
            {showToast && (
                <div style={{
                    position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(16,185,129,0.9)', color: 'white', padding: '12px 24px',
                    borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', zIndex: 1000,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}>
                    {toastMessage}
                </div>
            )}

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
