'use client';

import {useLanguage} from '@/contexts/LanguageContext';
import {useRef, useEffect, useState, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {
    ArrowLeft, Video, VideoOff, Mic, MicOff, Square,
    CheckCircle, Flag, RotateCcw, FileDown, Eye, Trash2, X
} from 'lucide-react';
import {useGeminiLive, InspectionRecord} from '@/hooks/useGeminiLive';
import {getRecordStatus, STATUS_CONFIG} from '@/lib/recordStatus';
import {QRCodeSVG} from 'qrcode.react';
import {CloudUpload, Pencil, ChevronLeft} from 'lucide-react';

const getGlossaryBadgeStyle = (condition: string, isManualFlag?: boolean) => {
    const cond = (condition || "").toLowerCase().trim();
    if (isManualFlag) {
        return {
            bg: "rgba(220, 38, 38, 0.15)",
            color: "#f87171",
            border: "rgba(220, 38, 38, 0.4)",
            icon: "🚩"
        };
    }
    if (cond.includes("very poor")) {
        return {
            bg: "rgba(127, 29, 29, 0.25)",
            color: "#f87171",
            border: "rgba(127, 29, 29, 0.5)",
            icon: "⚠️"
        };
    }
    if (cond.includes("poor")) {
        return {
            bg: "rgba(239, 68, 68, 0.15)",
            color: "#ef4444",
            border: "rgba(239, 68, 68, 0.3)",
            icon: "⚠️"
        };
    }
    if (cond.includes("fair")) {
        return {
            bg: "rgba(245, 158, 11, 0.15)",
            color: "#f59e0b",
            border: "rgba(245, 158, 11, 0.3)",
            icon: "⚠️"
        };
    }
    if (cond.includes("good")) {
        return {
            bg: "rgba(59, 130, 246, 0.15)",
            color: "#3b82f6",
            border: "rgba(59, 130, 246, 0.3)",
            icon: "✅"
        };
    }
    if (cond.includes("new")) {
        return {
            bg: "rgba(16, 185, 129, 0.15)",
            color: "#10b981",
            border: "rgba(16, 185, 129, 0.3)",
            icon: "✅"
        };
    }
    return {
        bg: "rgba(156, 163, 175, 0.15)",
        color: "#9ca3af",
        border: "rgba(156, 163, 175, 0.3)",
        icon: "🔍"
    };
};

export default function InspectionLive() {
    const {t, language, setLanguage} = useLanguage();
    const router = useRouter();

    const videoRef = useRef<HTMLVideoElement>(null);
    // ---------------------------------------------------------------------------
    // 核心状态绑定 (来自 useGeminiLive)
    // ---------------------------------------------------------------------------
    const {
        isConnected,
        isConnecting,
        aiStatus,
        logs,
        records,
        uploadReportId,
        isUploading,
        startSession,
        stopSession,
        clearSessionData,
        captureVideoFrame,
        flagIssue,
        deleteRecord,
        updateRecord,
        uploadToServer
    } = useGeminiLive();

    // ---------------------------------------------------------------------------
    // 页面级 UI 状态
    // ---------------------------------------------------------------------------
    // 手动标记缺陷（Flag Issue）相关的短暂视觉反馈状态
    const [flaggedPhoto, setFlaggedPhoto] = useState<string | undefined>(undefined);
    const [isFlagging, setIsFlagging] = useState(false);
    const [showFlagFlash, setShowFlagFlash] = useState(false);

    // 查看和编辑特定记录的模态框状态
    const [viewingRecord, setViewingRecord] = useState<InspectionRecord | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({room_name: '', item_name: '', description: '', condition: ''});

    // 是否处于“复核模式”（即用户暂停了录像，正在修改列表）
    const [isReviewing, setIsReviewing] = useState(false);

    // ── 意外退出后的恢复提示 ──────────────────────────────────────────────────────
    // 当 inspection 页面挂载时，检测 localStorage 里是否有未完成的巡检记录，
    // 如有则显示恢复提示弹窗，让用户决定是继续还是清空重来。
    const [showResumePrompt, setShowResumePrompt] = useState(false);

    const isReviewMode = isReviewing && !uploadReportId && !isUploading;

    const toggleLanguage = () => setLanguage(language === 'zh' ? 'en' : 'zh');

    useEffect(() => {
        return () => {
            stopSession();
        };
    }, []);

    // 检测历史记录：records 由 useGeminiLive 从 localStorage 异步恢复后设置。
    // 只在初始挂载时检查一次，不要放在 records 函数里避免每次弹窗。
    useEffect(() => {
        // 设置 60ms 延迟，等 useGeminiLive 的首个 useEffect（加载 localStorage）先执行完毕
        const timer = setTimeout(() => {
            try {
                const saved = localStorage.getItem('inspection_records');
                if (saved && saved !== '[]') {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setShowResumePrompt(true);
                    }
                }
            } catch {
            }
        }, 80);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * 控制录制的开始与暂停。
     * 当连接中时，点击该按钮会进入“复核模式”(Review Mode)；
     * 当未连接且在复核模式时，点击会恢复之前的录制。
     */
    const handleToggleConnection = () => {
        if (isConnected || isConnecting) {
            stopSession(true); // 传入 true 表示只是暂停进入复核，不要彻底销毁视频流
            setIsReviewing(true);
        } else {
            if (videoRef.current) {
                startSession(videoRef.current, language); // 恢复时重新建立 WebSocket 并在原视频流上继续录制
                setIsReviewing(false);
            }
        }
    };

    const handleRestart = () => {
        if (window.confirm(language === 'zh'
            ? '确定要重新开始吗？这将清除当前所有巡检记录。'
            : 'Are you sure you want to restart? This will clear all current records.')) {
            if (isConnected || isConnecting) stopSession();
            clearSessionData();
        }
    };

    // ---------------------------------------------------------------------------
    // 手动标记高危问题点 (Flag Issue) 处理逻辑
    // ---------------------------------------------------------------------------
    const handleFlagIssue = useCallback(() => {
        if (!isConnected) {
            alert(language === 'zh' ? '请先启动巡检会话' : 'Please start an inspection session first.');
            return;
        }
        setIsFlagging(true);
        const photo = flagIssue(language); // 立即截取高清图并下发指令给 AI
        setFlaggedPhoto(photo);

        // 触发相机快门特效（屏幕闪烁红光）
        setShowFlagFlash(true);
        setTimeout(() => setShowFlagFlash(false), 600);

        // 4 秒后隐藏界面上的照片预览缩略图
        setTimeout(() => {
            setFlaggedPhoto(undefined);
            setIsFlagging(false);
        }, 4000);
    }, [isConnected, flagIssue, language]);

    // (PDF Generation logic removed for new single-direction workflow)

    return (
        <main className="relative w-full h-dvh bg-black text-slate-100 font-sans overflow-hidden">

            {/* 🔄 意外退出后的恢复提示弹窗 (Resume Prompt) */}
            {showResumePrompt && (
                <div
                    className="absolute inset-0 z-150 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <div
                        className="bg-slate-800/90 border border-slate-700/60 rounded-3xl p-7 max-w-sm w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* Icon */}
                        <div
                            className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mx-auto">
                            <span className="text-2xl">📋</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white mb-1">
                                {language === 'zh' ? '发现未完成的巡检记录' : 'Unfinished Inspection Found'}
                            </h2>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {language === 'zh'
                                    ? `发现上次巡检保留了 ${records.length} 条记录。是否继续上次的工作？`
                                    : `Found ${records.length} records from your previous session. Continue where you left off?`}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowResumePrompt(false)}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                            >
                                ✅ {language === 'zh' ? '是，继续上次巡检' : 'Yes, resume session'}
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm(
                                        language === 'zh'
                                            ? '确定清除之前所有记录并重新开始？'
                                            : 'Clear all previous records and start fresh?'
                                    )) {
                                        clearSessionData();
                                        setShowResumePrompt(false);
                                    }
                                }}
                                className="w-full py-3 bg-white/8 hover:bg-white/15 active:scale-95 text-slate-300 font-semibold rounded-2xl transition-all border border-white/10"
                            >
                                🗑️ {language === 'zh' ? '不，清空重新开始' : 'No, start fresh'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {showFlagFlash && (
                <div className="absolute inset-0 z-90 bg-red-500/40 pointer-events-none animate-pulse"/>
            )}

            {/* 🚩 Flag Issue: HD snapshot preview */}
            {flaggedPhoto && !showFlagFlash && (
                <div className="absolute top-16 left-3 right-3 z-80 pointer-events-none">
                    <div
                        className="relative rounded-2xl overflow-hidden border-2 border-red-500 shadow-2xl shadow-red-500/40">
                        <img
                            src={`data:image/jpeg;base64,${flaggedPhoto}`}
                            alt="Flagged issue"
                            className="w-full h-44 object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"/>
                        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                                <span className="text-sm leading-none">🚩</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-red-300">
                                    {language === 'zh' ? '已手动标记 · 正在发送AI分析...' : 'Manually Flagged · Sending to AI...'}
                                </p>
                                <p className="text-[10px] text-white/60">
                                    {language === 'zh' ? 'AI将立即记录这个缺陷点' : 'AI will document this defect immediately'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BACKGROUND: Video Viewfinder */}
            <div className="absolute inset-0 z-0 bg-[#0d0d1a]">

                {/* Camera Off Placeholder */}
                {!isConnected && !isConnecting && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-[#0d0d1a]">
                        <VideoOff className="w-12 h-12 mb-3 opacity-40"/>
                        <p className="text-sm opacity-60">
                            {language === 'zh' ? '点击开始按钮启动摄像头' : 'Tap Start to activate camera'}
                        </p>
                    </div>
                )}

                <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    style={{willChange: 'transform'}}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Header */}
                <header
                    className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-10 bg-linear-to-b from-black/70 to-transparent">
                    <button
                        onClick={() => {
                            stopSession();
                            router.push('/');
                        }}
                        className="p-2 -ml-1 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 drop-shadow-md"/>
                    </button>

                    <div className="flex items-center gap-2 drop-shadow-md">
                        <div
                            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-slate-500'}`}/>
                        <span className="text-xs font-semibold tracking-wide">
                          {isConnecting ? t.inspection.status_connecting : (isConnected ? t.inspection.status_live : 'Ready')}
                        </span>
                        {isConnected && (
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm border ${
                                aiStatus === 'speaking' ? 'bg-blue-500/30 text-blue-300 border-blue-400/50' :
                                    aiStatus === 'processing' ? 'bg-amber-500/30 text-amber-300 border-amber-400/50' :
                                        'bg-emerald-500/30 text-emerald-300 border-emerald-400/50'
                            }`}>{aiStatus}</span>
                        )}
                        {records.length > 0 && (
                            <span className="text-xs bg-white/20 backdrop-blur px-2 py-0.5 rounded-full font-bold">
                                {records.length} {language === 'zh' ? '条' : 'records'}
                              </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={toggleLanguage}
                        className="flex items-center justify-center w-8 h-8 bg-black/40 backdrop-blur-md rounded-full text-xs font-bold text-slate-200 hover:bg-black/60 active:scale-90 transition-all border border-white/10"
                    >
                        {language === 'zh' ? 'EN' : '中'}
                    </button>
                </header>

                {/* Recent Records overlay */}
                <div className="absolute top-16 left-2 right-2 flex flex-col gap-1.5 z-10 pointer-events-none">
                    {records.slice(-2).map((rec) => (
                        <div key={rec.id}
                             className="bg-black/50 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl shadow-lg pointer-events-auto flex items-start justify-between">
                            <div className="flex items-start gap-2 max-w-[70%]">
                                {rec.photoBase64 && (
                                    <img
                                        src={`data:image/jpeg;base64,${rec.photoBase64}`}
                                        alt=""
                                        className="w-10 h-8 object-cover rounded-lg shrink-0 border border-white/10"
                                    />
                                )}
                                {/* Status icon */}
                                <span className="text-base shrink-0 mt-0.5"
                                      title={STATUS_CONFIG[getRecordStatus(rec.condition, rec.isManualFlag)].label}>
                  {STATUS_CONFIG[getRecordStatus(rec.condition, rec.isManualFlag)].icon}
                </span>
                                <div className="overflow-hidden">
                                    <p className="text-[11px] font-semibold text-white/90 truncate">
                                        {rec.room_name} · {rec.item_name}
                                        {rec.description && <span className="text-blue-300"> ({rec.description})</span>}
                                    </p>
                                    <p className="text-[10px] text-white/60 truncate">{rec.condition}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => setViewingRecord(rec)}
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
                                >
                                    <Eye className="w-4 h-4 text-blue-300"/>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(language === 'zh' ? '确定删除这条记录吗？' : 'Delete this record?')) {
                                            deleteRecord(rec.id);
                                        }
                                    }}
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/40 active:bg-red-500/60 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-red-300"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FOREGROUND: Logs + Controls panel */}
            <div
                className="absolute bottom-0 left-0 right-0 h-[45vh] flex flex-col bg-linear-to-t from-black via-black/80 to-transparent z-10 overflow-hidden pt-12">

                {/* Logs */}
                <div className="flex-1 px-4 pt-3 overflow-y-auto min-h-0">
                    <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        {t.inspection.log_title}
                    </h3>
                    <div className="space-y-1 font-mono text-[11px] text-slate-400 flex flex-col">
                        {logs.slice(-10).map((log, i) => (
                            <div key={i} className="wrap-break-word leading-relaxed">{log}</div>
                        ))}
                        {logs.length === 0 && (
                            <p className="italic text-slate-600">
                                {language === 'zh' ? '等待事件...' : 'Waiting for events...'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div
                    className="shrink-0 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-center items-center gap-4">

                    {/* Restart */}
                    <button
                        onClick={handleRestart}
                        className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                    >
                        <RotateCcw className="w-4 h-4 text-slate-400"/>
                    </button>

                    {/* Mic status */}
                    <button className={`w-12 h-12 rounded-full flex items-center justify-center relative border border-white/10 transition-all
            ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-500'}`}>
                        {isConnected && <span className="absolute inset-0 rounded-full bg-green-400/20 animate-ping"/>}
                        {isConnected ? <Mic className="w-5 h-5 z-10"/> : <MicOff className="w-5 h-5 z-10 opacity-50"/>}
                    </button>

                    {/* Main Start/Stop */}
                    <button
                        onClick={handleToggleConnection}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl border border-white/10 active:scale-95
              ${isConnected
                            ? 'bg-red-500/80 text-white hover:bg-red-500'
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/50'
                        }`}
                    >
                        {isConnected ? <Square className="w-6 h-6 fill-current"/> : <Video className="w-7 h-7"/>}
                    </button>

                    {/* 🚩 Flag Issue */}
                    <button
                        onClick={handleFlagIssue}
                        disabled={!isConnected || isFlagging}
                        className={`w-12 h-12 rounded-full border border-white/10 flex items-center justify-center transition-all active:scale-95 relative
              ${isConnected
                            ? 'bg-red-600/30 hover:bg-red-600/50 text-red-400'
                            : 'bg-white/5 text-slate-600 cursor-not-allowed'
                        }`}
                        title={language === 'zh' ? '🚩 手动标记问题（高清拍照）' : '🚩 Manual Flag / HD Snapshot'}
                    >
                        {isFlagging
                            ? <span
                                className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin"/>
                            :
                            <Flag className={`w-5 h-5 ${isConnected ? 'text-red-400' : 'text-slate-600 opacity-50'}`}/>
                        }
                    </button>


                </div>
            </div>
            {/* Record Detail Modal */}
            {viewingRecord && (
                <div
                    className="absolute inset-0 z-120 bg-black/90 backdrop-blur-sm flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
                    <header className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
                        <h2 className="font-semibold text-white">{language === 'zh' ? '记录详情' : 'Record Details'}</h2>
                        <button onClick={() => setViewingRecord(null)}
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                            <X className="w-5 h-5"/>
                        </button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {viewingRecord.photoBase64 ? (
                            <img
                                src={`data:image/jpeg;base64,${viewingRecord.photoBase64}`}
                                alt="Record photo"
                                className="w-full rounded-2xl border border-white/20 shadow-2xl"
                            />
                        ) : (
                            <div
                                className="w-full aspect-video bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-slate-500">
                                <VideoOff className="w-8 h-8"/>
                            </div>
                        )}

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                            {isEditing ? (
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">{language === 'zh' ? '房间/区域' : 'Room / Area'}</p>
                                        <input
                                            value={editForm.room_name}
                                            onChange={e => setEditForm({...editForm, room_name: e.target.value})}
                                            className="w-full bg-black/40 text-white font-medium px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">{language === 'zh' ? '物品名称' : 'Item Name'}</p>
                                        <input
                                            value={editForm.item_name}
                                            onChange={e => setEditForm({...editForm, item_name: e.target.value})}
                                            className="w-full bg-black/40 text-white font-medium px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">{language === 'zh' ? '材质/描述' : 'Description'}</p>
                                        <textarea
                                            value={editForm.description}
                                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                                            className="w-full bg-black/40 text-blue-300 font-medium px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-blue-400 resize-none h-20"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">{language === 'zh' ? '物理状况评级' : 'Condition Rating'}</p>
                                        <select
                                            value={editForm.condition}
                                            onChange={e => setEditForm({...editForm, condition: e.target.value})}
                                            className="w-full bg-black text-white font-medium px-3 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:border-blue-400 cursor-pointer"
                                        >
                                            <option value="New Item">New Item</option>
                                            <option value="Good">Good</option>
                                            <option value="Fair">Fair</option>
                                            <option value="Poor">Poor</option>
                                            <option value="Very Poor">Very Poor</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 py-2.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20"
                                        >
                                            {language === 'zh' ? '取消' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                updateRecord(viewingRecord.id, editForm);
                                                setViewingRecord({...viewingRecord, ...editForm});
                                                setIsEditing(false);
                                            }}
                                            className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20"
                                        >
                                            {language === 'zh' ? '保存修改' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-xs text-white/50 mb-0.5">{language === 'zh' ? '房间/区域' : 'Room / Area'}</p>
                                        <p className="font-semibold text-white">{viewingRecord.room_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-0.5">{language === 'zh' ? '物品名称' : 'Item Name'}</p>
                                        <p className="font-semibold text-white">{viewingRecord.item_name}</p>
                                    </div>
                                    {viewingRecord.description && (
                                        <div>
                                            <p className="text-xs text-white/50 mb-0.5">{language === 'zh' ? '材质/描述' : 'Description'}</p>
                                            <p className="font-medium text-blue-300">{viewingRecord.description}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-white/50 mb-0.5">{language === 'zh' ? '状况' : 'Condition'}</p>
                                        {/* Status badge */}
                                        {(() => {
                                            const cfg = getGlossaryBadgeStyle(viewingRecord.condition, viewingRecord.isManualFlag);
                                            return (
                                                <span
                                                    style={{
                                                        background: cfg.bg,
                                                        border: `1px solid ${cfg.border}`,
                                                        color: cfg.color
                                                    }}
                                                    className="inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-lg"
                                                >
                                                      {cfg.icon} {viewingRecord.condition}
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => {
                                                setEditForm({
                                                    room_name: viewingRecord.room_name,
                                                    item_name: viewingRecord.item_name,
                                                    description: viewingRecord.description || '',
                                                    condition: viewingRecord.condition || ''
                                                });
                                                setIsEditing(true);
                                            }}
                                            className="flex-1 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 flex justify-center items-center gap-2"
                                        >
                                            <Pencil className="w-4 h-4"/>
                                            {language === 'zh' ? '编辑文本' : 'Edit Text'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(language === 'zh' ? '确定删除这条记录吗？' : 'Delete this record?')) {
                                                    deleteRecord(viewingRecord.id);
                                                    setViewingRecord(null);
                                                }
                                            }}
                                            className="flex-1 py-3 bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/30 hover:bg-red-500/30 flex justify-center items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                            {language === 'zh' ? '删除' : 'Delete'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Review Mode Full Screen Overlay */}
            {isReviewMode && (
                <div className="absolute inset-0 z-105 bg-[#0d0d1a] overflow-y-auto pb-32">
                    <header
                        className="sticky top-0 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 z-10 flex justify-between items-center">
                        <button onClick={() => setIsReviewing(false)}
                                className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-semibold">
                            <ChevronLeft className="w-5 h-5 -ml-1"/>
                            {language === 'zh' ? '返回继续' : 'Resume'}
                        </button>
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-white">{language === 'zh' ? '核对巡检结果' : 'Review'}</h2>
                            <p className="text-[10px] text-slate-400">{records.length} {language === 'zh' ? '条异常' : 'Defects'}</p>
                        </div>
                        <button onClick={() => {
                            if (confirm('Discard this inspection?')) {
                                clearSessionData();
                                setIsReviewing(false);
                            }
                        }} className="text-slate-500 hover:text-red-500 p-1">
                            <X className="w-5 h-5"/>
                        </button>
                    </header>

                    <div className="p-4 space-y-4">
                        {records.map(rec => (
                            <div key={rec.id} onClick={() => {
                                setViewingRecord(rec);
                                setIsEditing(false);
                            }}
                                 className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 active:scale-95 transition-transform"
                            >
                                {rec.photoBase64 ? (
                                    <img src={`data:image/jpeg;base64,${rec.photoBase64}`}
                                         className="w-24 h-24 object-cover rounded-xl shrink-0"/>
                                ) : (
                                    <div className="w-24 h-24 bg-white/5 rounded-xl flex justify-center items-center">
                                        <VideoOff className="w-8 h-8 text-slate-600"/></div>
                                )}
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-1">
                                        {/* Status badge */}
                                        {(() => {
                                            const cfg = getGlossaryBadgeStyle(rec.condition, rec.isManualFlag);
                                            return (
                                                <span
                                                    style={{
                                                        background: cfg.bg,
                                                        border: `1px solid ${cfg.border}`,
                                                        color: cfg.color
                                                    }}
                                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
                                                >
                                                  {cfg.icon} {rec.condition}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <h3 className="font-bold text-white truncate">{rec.room_name} - {rec.item_name}</h3>
                                    <p className="text-sm text-blue-300 truncate">{rec.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div
                        className="fixed bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black via-black to-transparent">
                        <button
                            onClick={uploadToServer}
                            className="w-full py-4 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95 transition-transform"
                        >
                            <CloudUpload className="w-6 h-6"/>
                            {language === 'zh' ? '确认无误，同步至云端' : 'Confirm & Sync to Cloud'}
                        </button>
                    </div>
                </div>
            )}

            {/* Upload & QR Code Modal */}
            {(isUploading || uploadReportId) && (
                <div
                    className="absolute inset-0 z-110 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-4">
                            <span
                                className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
                            <h2 className="text-xl font-bold text-white">{language === 'zh' ? '正在静默长传数据到基站...' : 'Uploading to Server...'}</h2>
                            <p className="text-slate-400 text-sm">Please do not close the app.</p>
                        </div>
                    ) : uploadReportId ? (
                        <div
                            className="flex flex-col items-center gap-6 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <div className="bg-green-500/20 p-4 rounded-full">
                                <CheckCircle className="w-12 h-12 text-green-400"/>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">{language === 'zh' ? '同步成功！' : 'Sync Complete!'}</h2>
                                <p className="text-slate-400 text-sm mb-4">
                                    {language === 'zh' ? '请使用 iPad 或笔记本扫描下方二维码直接查看互动报告：' : 'Scan the QR code with an iPad or Laptop to view the interactive report:'}
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-2xl shadow-xl">
                                <QRCodeSVG
                                    value={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000/report/${uploadReportId}`}
                                    size={200}/>
                            </div>

                            <div
                                className="mt-2 w-full bg-black/50 rounded-xl p-3 border border-white/10 break-all text-left">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Direct Link:</p>
                                <p className="text-xs text-blue-300 font-mono select-all">
                                    http://{typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000/report/{uploadReportId}
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    window.location.href = '/';
                                }}
                                className="mt-2 w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
                            >
                                {language === 'zh' ? '完成并返回首页' : 'Done'}
                            </button>
                        </div>
                    ) : null}
                </div>
            )}

        </main>
    );
}
