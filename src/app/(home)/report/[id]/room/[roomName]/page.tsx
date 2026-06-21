'use client';

import {useRef, useState, useEffect, useMemo} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft, Edit2, Check, Plus, Trash2, Clock, Play,
    Video, Search, Filter, Undo, FileVideo, Loader2,
} from 'lucide-react';
import {apiGet, apiPut, apiPost, apiDelete} from '@/lib/api';
import {toast} from 'sonner';
import type {Inspection, InspectionVideo, InsoectionItem} from '@/types';

const ELEMENT_KEYWORDS = [
    'door', 'flooring', 'wall', 'ceiling', 'window', 'baseboard', 'skirting',
    'radiator', 'heating', 'stair', 'lighting', 'socket', 'switch', 'sink', 'tap',
];

const getConditionBadgeStyle = (condition: string) => {
    const cond = (condition || '').toLowerCase().trim();
    const base = {padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' as const, display: 'inline-block'};
    if (cond.includes('very poor')) return {...base, backgroundColor: 'rgba(127,29,29,0.25)', color: '#f87171', border: '1px solid rgba(127,29,29,0.4)'};
    if (cond.includes('poor')) return {...base, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)'};
    if (cond.includes('fair')) return {...base, backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)'};
    if (cond.includes('good')) return {...base, backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)'};
    if (cond.includes('new')) return {...base, backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)'};
    return {...base, backgroundColor: 'rgba(156,163,175,0.15)', color: '#9ca3af', border: '1px solid rgba(156,163,175,0.3)'};
};

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface RoomItem extends InsoectionItem {
    _videoId: number;
    _videoSrc: string;
}

export default function RoomDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const roomName = decodeURIComponent(params.roomName as string);

    const videoRef = useRef<HTMLVideoElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);

    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [videos, setVideos] = useState<(InspectionVideo & {items?: InsoectionItem[]})[]>([]);
    const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
    const [activeTimestampIdx, setActiveTimestampIdx] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [conditionFilter, setConditionFilter] = useState('all');
    const [isEditing, setIsEditing] = useState(false);

    const [editItems, setEditItems] = useState<RoomItem[]>([]);
    const [historyStack, setHistoryStack] = useState<RoomItem[][]>([]);

    // ─── Fetch ────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const data = await apiGet(`/inspections/${id}`);
                setInspection(data);
                const vids = data.videos || [];
                setVideos(vids);
                const firstWithRoom = vids.find((v: any) =>
                    (v.items || []).some((i: any) => (i.room_name || '').toLowerCase() === roomName.toLowerCase())
                );
                setActiveVideoId(firstWithRoom?.id || vids[0]?.id || null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id, roomName]);

    // ─── Derived: all room items across videos ────────────────────────────────

    const roomItems: RoomItem[] = useMemo(() => {
        const items: RoomItem[] = [];
        for (const video of videos) {
            for (const item of (video.items || [])) {
                if ((item.room_name || '').toLowerCase() === roomName.toLowerCase()) {
                    items.push({...item, _videoId: video.id, _videoSrc: video.src});
                }
            }
        }
        return items.sort((a, b) => a.elapsed_seconds - b.elapsed_seconds);
    }, [videos, roomName]);

    const relevantVideos = useMemo(() =>
            videos.filter(v => (v.items || []).some(i => (i.room_name || '').toLowerCase() === roomName.toLowerCase())),
        [videos, roomName]
    );

    useEffect(() => {
        setEditItems(roomItems.map(i => ({...i})));
    }, [roomItems]);

    useEffect(() => {
        setHistoryStack([]);
    }, [isEditing]);

    const activeVideo = useMemo(() => videos.find(v => v.id === activeVideoId) || null, [videos, activeVideoId]);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const isElement = (name: string) => ELEMENT_KEYWORDS.some(kw => name.toLowerCase().includes(kw));
    const displayItems = isEditing ? editItems : roomItems;

    const filterList = (list: RoomItem[]) => list.filter(item => {
        const matchSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
            || (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchCondition = conditionFilter === 'all'
            || item.condition.toLowerCase().includes(conditionFilter.toLowerCase());
        return matchSearch && matchCondition;
    });

    const elements = filterList(displayItems.filter(r => isElement(r.item_name)));
    const inventory = filterList(displayItems.filter(r => !isElement(r.item_name)));

    // ─── Video switching + seek ───────────────────────────────────────────────

    const handleSeek = (item: RoomItem, idx: number) => {
        if (item._videoId !== activeVideoId) {
            setActiveVideoId(item._videoId);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.currentTime = item.elapsed_seconds;
                    videoRef.current.play().catch(() => {});
                }
            }, 300);
        } else if (videoRef.current) {
            videoRef.current.currentTime = item.elapsed_seconds;
            videoRef.current.play().catch(() => {});
        }
        setActiveTimestampIdx(idx);
        if (carouselRef.current) {
            const card = carouselRef.current.children[idx] as HTMLElement | undefined;
            if (card) {
                const center = card.offsetLeft + card.offsetWidth / 2;
                carouselRef.current.scrollTo({left: center - carouselRef.current.clientWidth / 2, behavior: 'smooth'});
            }
        }
    };

    const handleSelectVideo = (videoId: number) => {
        setActiveVideoId(videoId);
        if (videoRef.current) videoRef.current.load();
    };

    // ─── Edit operations ──────────────────────────────────────────────────────

    const saveHistoryState = () => {
        setHistoryStack(prev => {
            const next = [...prev, editItems.map(i => ({...i}))];
            return next.length > 50 ? next.slice(-50) : next;
        });
    };

    const handleUndo = () => {
        if (historyStack.length === 0) return;
        setEditItems(historyStack[historyStack.length - 1]);
        setHistoryStack(prev => prev.slice(0, -1));
        toast.info('Undone last action');
    };

    const handleCellChange = (itemId: number, field: string, value: any) => {
        setEditItems(prev => prev.map(rec => rec.id === itemId ? {...rec, [field]: value} : rec));
    };

    const handleAcquireTimestamp = (itemId: number) => {
        if (!videoRef.current) return;
        saveHistoryState();
        const t = Math.round(videoRef.current.currentTime);
        handleCellChange(itemId, 'elapsed_seconds', t);
        toast.info(`Timestamp set: ${formatTime(t)}`);
    };

    const handleAddRow = (type: 'element' | 'inventory') => {
        if (!activeVideoId) return;
        saveHistoryState();
        const newItem: RoomItem = {
            id: -Date.now(),
            video_id: activeVideoId,
            room_name: roomName,
            item_name: type === 'element' ? 'Flooring' : 'Personal Items',
            description: '',
            condition: 'Good',
            severity: '',
            elapsed_seconds: videoRef.current ? Math.round(videoRef.current.currentTime) : 0,
            image: '',
            created_at: '',
            updated_at: '',
            _videoId: activeVideoId,
            _videoSrc: activeVideo?.src || '',
        };
        setEditItems(prev => [...prev, newItem]);
    };

    const handleDeleteRow = (itemId: number) => {
        saveHistoryState();
        setEditItems(prev => prev.filter(rec => rec.id !== itemId));
    };

    const handleSaveAll = async () => {
        try {
            const deleted = roomItems.filter(orig => !editItems.find(e => e.id === orig.id));
            const created = editItems.filter(e => e.id < 0);
            const updated = editItems.filter(e => e.id > 0);

            for (const item of deleted) {
                await apiDelete(`/inspection-items/${item.id}`);
            }

            for (const item of created) {
                await apiPost(`/inspections/${id}/videos/${item._videoId}/items`, {
                    room_name: item.room_name,
                    item_name: item.item_name,
                    description: item.description,
                    condition: item.condition,
                    severity: item.severity,
                    elapsed_seconds: item.elapsed_seconds,
                });
            }

            for (const item of updated) {
                const orig = roomItems.find(o => o.id === item.id);
                if (!orig) continue;
                const changed = orig.item_name !== item.item_name
                    || orig.description !== item.description
                    || orig.condition !== item.condition
                    || orig.severity !== item.severity
                    || orig.elapsed_seconds !== item.elapsed_seconds;
                if (changed) {
                    await apiPut(`/inspection-items/${item.id}`, {
                        item_name: item.item_name,
                        description: item.description,
                        condition: item.condition,
                        severity: item.severity,
                        elapsed_seconds: item.elapsed_seconds,
                    });
                }
            }

            const refreshed = await apiGet(`/inspections/${id}`);
            setVideos(refreshed.videos || []);
            setIsEditing(false);
            toast.success('Room edits saved!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to save');
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{color: 'var(--primary)'}}/>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                <div className="glass-panel" style={{padding: '50px', textAlign: 'center', border: '1px solid var(--danger)'}}>
                    <h1 style={{color: 'var(--danger)'}}>Room Data Error</h1>
                    <p style={{color: 'var(--text-muted)'}}>{error}</p>
                    <Link href={`/report/${id}`} className="sheet-select"
                          style={{display: 'inline-block', marginTop: '20px', textDecoration: 'none'}}>
                        Back to report
                    </Link>
                </div>
            </div>
        );
    }

    const property = inspection?.property;

    return (
        <>
            {/* Header */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px',
                position: 'sticky', top: 0, zIndex: 20,
                background: 'rgba(10,10,20,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                margin: '-24px -24px 24px -24px', padding: '14px 24px',
                borderBottom: '1px solid var(--panel-border)',
            }}>
                <div>
                    <Link href={`/report/${id}`} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)',
                        textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px',
                    }}>
                        <ChevronLeft size={16}/>
                        Back to {property?.name || 'Report Overview'}
                    </Link>
                    <h1 style={{fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        {roomName}
                    </h1>
                </div>

                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    {isEditing && (
                        <button
                            onClick={handleUndo}
                            disabled={historyStack.length === 0}
                            className="glass-panel"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                                backgroundColor: 'var(--panel-bg)',
                                color: historyStack.length === 0 ? 'var(--text-dark)' : 'var(--foreground)',
                                border: '1px solid var(--panel-border)', fontWeight: 'bold',
                                cursor: historyStack.length === 0 ? 'not-allowed' : 'pointer',
                                borderRadius: '12px', opacity: historyStack.length === 0 ? 0.4 : 1,
                            }}
                        >
                            <Undo size={16}/> Undo
                        </button>
                    )}
                    <button
                        onClick={() => { if (isEditing) handleSaveAll(); else setIsEditing(true); }}
                        className="glass-panel"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                            backgroundColor: isEditing ? 'var(--primary-bg)' : 'var(--panel-bg)',
                            color: isEditing ? 'var(--primary)' : 'var(--foreground)',
                            border: isEditing ? '1px solid var(--primary)' : '1px solid var(--panel-border)',
                            fontWeight: 'bold', cursor: 'pointer', borderRadius: '12px',
                        }}
                    >
                        {isEditing ? <><Check size={16}/> Done</> : <><Edit2 size={16}/> Edit Elements</>}
                    </button>
                </div>
            </header>

            {/* Main grid */}
            <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'flex-start', minWidth: 0}}>

                {/* Left: player + video selector + timestamps */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: 80, alignSelf: 'start'}}>
                    <div className="glass-panel" style={{overflow: 'hidden', background: 'black', borderRadius: '16px'}}>
                        {activeVideo ? (
                            <video
                                ref={videoRef}
                                style={{width: '100%', maxHeight: '360px', display: 'block'}}
                                controls
                                preload="auto"
                                src={activeVideo.src}
                            />
                        ) : (
                            <div style={{height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)'}}>
                                No video available
                            </div>
                        )}
                    </div>

                    {/* Video selector (if multiple videos have items in this room) */}
                    {relevantVideos.length > 1 && (
                        <div className="glass-panel" style={{padding: '12px', overflow: 'hidden'}}>
                            <h3 style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <Video size={12}/> Videos with this room ({relevantVideos.length})
                            </h3>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                {relevantVideos.map(video => {
                                    const isActive = video.id === activeVideoId;
                                    const count = (video.items || []).filter(i => (i.room_name || '').toLowerCase() === roomName.toLowerCase()).length;
                                    return (
                                        <div
                                            key={video.id}
                                            onClick={() => handleSelectVideo(video.id)}
                                            style={{
                                                padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                                                background: isActive ? 'var(--primary-bg)' : 'rgba(255,255,255,0.02)',
                                                transition: 'var(--transition)',
                                            }}
                                        >
                                            {isActive
                                                ? <Play size={13} style={{color: 'var(--primary)', fill: 'var(--primary)', flexShrink: 0}}/>
                                                : <FileVideo size={13} style={{color: 'var(--text-muted)', flexShrink: 0}}/>
                                            }
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: 'bold', flex: 1, minWidth: 0,
                                                color: isActive ? 'var(--primary)' : 'var(--foreground)',
                                            }} className="truncate">
                                                {video.src?.split('/').pop() || `Video #${video.id}`}
                                            </span>
                                            <span style={{fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0}}>
                                                {count} items
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Timestamp carousel */}
                    <div className="glass-panel" style={{padding: '16px', overflow: 'hidden'}}>
                        <h3 style={{fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                            <Video size={14}/> AI Captured Timestamps
                        </h3>
                        <div ref={carouselRef} style={{display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'thin'}}>
                            {displayItems.map((item, idx) => {
                                const isActive = activeTimestampIdx === idx;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSeek(item, idx)}
                                        className="glass-panel glass-panel-hover"
                                        style={{
                                            padding: '10px 14px', cursor: 'pointer',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                            minWidth: '84px', flexShrink: 0,
                                            transition: 'background 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease',
                                            background: isActive ? 'rgba(99,102,241,0.22)' : undefined,
                                            boxShadow: isActive ? '0 0 0 2px var(--primary), 0 4px 18px rgba(99,102,241,0.35)' : undefined,
                                            transform: isActive ? 'scale(1.06)' : 'scale(1)',
                                        }}
                                    >
                                        <Clock size={16} style={{color: isActive ? 'var(--primary)' : undefined}}/>
                                        <span style={{fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace', color: isActive ? 'var(--primary)' : undefined}}>
                                            {formatTime(item.elapsed_seconds || 0)}
                                        </span>
                                        <span style={{fontSize: '0.6rem', color: isActive ? 'var(--primary)' : 'var(--text-dark)', textAlign: 'center'}} className="truncate w-14">
                                            {item.item_name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Elements & Inventory tables */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                    {/* Filters */}
                    <div className="glass-panel" style={{
                        padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
                        position: 'sticky', top: 80, zIndex: 10,
                        background: 'rgba(18,18,35,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    }}>
                        <div className="search-container" style={{maxWidth: '260px'}}>
                            <Search size={14} className="search-icon" style={{left: '10px'}}/>
                            <input
                                type="text" className="search-input"
                                style={{padding: '8px 12px 8px 30px', fontSize: '0.8rem'}}
                                placeholder="Search items..."
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <Filter size={14} className="text-muted"/>
                            <select className="sheet-select" style={{padding: '6px 10px', fontSize: '0.75rem'}}
                                    value={conditionFilter} onChange={e => setConditionFilter(e.target.value)}>
                                <option value="all">All Conditions</option>
                                <option value="new">New Item</option>
                                <option value="good">Good</option>
                                <option value="fair">Fair</option>
                                <option value="poor">Poor</option>
                                <option value="very poor">Very Poor</option>
                            </select>
                        </div>
                    </div>

                    {/* Elements Table */}
                    <ItemTable
                        title="Elements (Building & Hard Features)"
                        items={elements}
                        isEditing={isEditing}
                        roomItems={displayItems}
                        onAdd={() => handleAddRow('element')}
                        onDelete={handleDeleteRow}
                        onChange={handleCellChange}
                        onAcquireTimestamp={handleAcquireTimestamp}
                        onSeek={handleSeek}
                        onFocusSave={saveHistoryState}
                        showQty={false}
                    />

                    {/* Inventory Table */}
                    <ItemTable
                        title="Inventory & Safety (Furnishings / Appliances)"
                        items={inventory}
                        isEditing={isEditing}
                        roomItems={displayItems}
                        onAdd={() => handleAddRow('inventory')}
                        onDelete={handleDeleteRow}
                        onChange={handleCellChange}
                        onAcquireTimestamp={handleAcquireTimestamp}
                        onSeek={handleSeek}
                        onFocusSave={saveHistoryState}
                        showQty={true}
                    />
                </div>
            </div>
        </>
    );
}

// ─── Shared table component ───────────────────────────────────────────────────

function ItemTable({title, items, isEditing, roomItems, onAdd, onDelete, onChange, onAcquireTimestamp, onSeek, onFocusSave, showQty}: {
    title: string;
    items: RoomItem[];
    isEditing: boolean;
    roomItems: RoomItem[];
    onAdd: () => void;
    onDelete: (id: number) => void;
    onChange: (id: number, field: string, value: any) => void;
    onAcquireTimestamp: (id: number) => void;
    onSeek: (item: RoomItem, idx: number) => void;
    onFocusSave: () => void;
    showQty: boolean;
}) {
    return (
        <div className="glass-panel" style={{overflow: 'hidden'}}>
            <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--panel-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <h3 style={{margin: 0, fontSize: '0.95rem', fontWeight: 'bold'}}>{title}</h3>
                {isEditing && (
                    <button type="button" onClick={onAdd} style={{
                        background: 'transparent', border: 'none', color: 'var(--primary)',
                        fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                        <Plus size={14}/> Add
                    </button>
                )}
            </div>
            <div style={{overflowX: 'auto'}}>
                <table className="sheet-table">
                    <thead>
                    <tr>
                        {isEditing && <th className="sheet-th" style={{width: '40px'}}/>}
                        <th className="sheet-th" style={{width: '120px'}}>Item</th>
                        {showQty && <th className="sheet-th" style={{width: '50px'}}>QTY</th>}
                        <th className="sheet-th" style={{width: '90px'}}>Timestamp</th>
                        <th className="sheet-th" style={{width: '100px'}}>Condition</th>
                        <th className="sheet-th">Notes</th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map(item => {
                        const globalIdx = roomItems.findIndex(r => r.id === item.id);
                        return (
                            <tr key={item.id} className="sheet-tr">
                                {isEditing && (
                                    <td className="sheet-td" style={{textAlign: 'center'}}>
                                        <button type="button" onClick={() => onDelete(item.id)}
                                                style={{background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer'}}>
                                            <Trash2 size={14}/>
                                        </button>
                                    </td>
                                )}
                                <td className="sheet-td">
                                    {isEditing ? (
                                        <input type="text" className="sheet-input" value={item.item_name}
                                               onFocus={onFocusSave}
                                               onChange={e => onChange(item.id, 'item_name', e.target.value)}/>
                                    ) : (
                                        <span style={{fontWeight: 'bold'}}>{item.item_name}</span>
                                    )}
                                </td>
                                {showQty && (
                                    <td className="sheet-td" style={{textAlign: 'center'}}>
                                        {isEditing ? (
                                            <input type="number" className="sheet-input"
                                                   style={{width: '50px', textAlign: 'center'}}
                                                   value={(item as any).qty || 1}
                                                   onFocus={onFocusSave}
                                                   onChange={e => onChange(item.id, 'qty', parseInt(e.target.value) || 1)}/>
                                        ) : (
                                            <span>{(item as any).qty || 1}</span>
                                        )}
                                    </td>
                                )}
                                <td className="sheet-td">
                                    {isEditing ? (
                                        <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                            <span style={{fontSize: '0.75rem', fontFamily: 'monospace'}}>
                                                {formatTime(item.elapsed_seconds || 0)}
                                            </span>
                                            <button type="button" onClick={() => onAcquireTimestamp(item.id)}
                                                    className="sheet-select" style={{padding: '4px 6px'}} title="Capture current time">
                                                <Plus size={10}/>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onSeek(item, globalIdx)}
                                            className="badge badge-primary"
                                            style={{fontFamily: 'monospace', cursor: 'pointer', border: 'none', display: 'inline-flex', gap: '4px'}}
                                        >
                                            <Play size={10}/>
                                            {formatTime(item.elapsed_seconds || 0)}
                                        </button>
                                    )}
                                </td>
                                <td className="sheet-td">
                                    {isEditing ? (
                                        <select className="sheet-select" value={item.condition}
                                                onFocus={onFocusSave}
                                                onChange={e => onChange(item.id, 'condition', e.target.value)}>
                                            <option>New Item</option>
                                            <option>Good</option>
                                            <option>Fair</option>
                                            <option>Poor</option>
                                            <option>Very Poor</option>
                                        </select>
                                    ) : (
                                        <span style={getConditionBadgeStyle(item.condition)}>{item.condition}</span>
                                    )}
                                </td>
                                <td className="sheet-td">
                                    {isEditing ? (
                                        <input type="text" className="sheet-input"
                                               value={item.description || ''}
                                               onFocus={onFocusSave}
                                               onChange={e => onChange(item.id, 'description', e.target.value)}/>
                                    ) : (
                                        <span style={{color: 'var(--text-muted)'}}>{item.description || 'N/A'}</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
