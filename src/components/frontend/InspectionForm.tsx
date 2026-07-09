'use client';

import {useLocale, useTranslations} from "@/contexts/LocaleContext";
import {
    AlertCircle,
    ArrowRight,
    Camera,
    Check,
    CheckCircle2,
    File,
    FileText,
    FileVideo,
    GripVertical,
    HomeIcon,
    Loader2,
    LogOut,
    MapPin,
    Plus,
    RotateCcw,
    UploadCloud,
    User,
    Video,
    X,
} from "lucide-react";
import {signOut, useSession} from "next-auth/react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {apiPost} from "@/lib/api";
import {usePropertyListQuery} from "@/queries/property";
import Autocomplete from "react-google-autocomplete";
import ModalCamera from "@/components/frontend/ModalCamera";
import {useNewReport} from "@/contexts/ReportContext";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {formatFileSize, type UploadFileItem, type UploadFileStatus, useVideoUploadQueue} from "@/hooks/useVideoUploadQueue";
import SortableProvider from "@/components/common/SortableProvider";
import {useSortable} from "@dnd-kit/react/sortable";

// ─── Mobile Video Queue Item ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<UploadFileStatus, { label: string; color: string; bg: string; spin: boolean }> = {
    pending: {label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-100', spin: false},
    uploading: {label: 'Uploading', color: 'text-blue-600', bg: 'bg-blue-50', spin: true},
    merging: {label: 'Merging', color: 'text-indigo-600', bg: 'bg-indigo-50', spin: true},
    saving: {label: 'Saving', color: 'text-emerald-600', bg: 'bg-emerald-50', spin: true},
    completed: {label: 'Done', color: 'text-emerald-600', bg: 'bg-emerald-50', spin: false},
    error: {label: 'Failed', color: 'text-red-600', bg: 'bg-red-50', spin: false},
};

function MobileVideoItem({item, index, canDrag, onRemove, onRetry}: {
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
        transition: {duration: 200, easing: 'ease'},
    });

    const cfg = STATUS_CONFIG[item.status];
    const isActive = item.status === 'uploading' || item.status === 'merging' || item.status === 'saving';
    const isCompleted = item.status === 'completed';
    const canControl = item.status === 'pending' || item.status === 'error';

    return (
        <div
            ref={ref}
            className={`p-3 rounded-2xl border mb-2 transition-all select-none ${
                isDragging
                    ? 'border-blue-400 bg-blue-50/60 shadow-lg shadow-blue-100 opacity-80 scale-[1.02]'
                    : isActive
                        ? 'border-blue-200 bg-blue-50/40'
                        : isCompleted
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-slate-200 bg-white'
            }`}
        >
            <div className="flex items-center gap-3">
                {/* Drag handle */}
                <div
                    className={`shrink-0 flex items-center justify-center w-7 h-full py-1 ${canDrag ? 'cursor-grab active:cursor-grabbing text-slate-300' : 'text-slate-200 cursor-default'}`}
                >
                    <GripVertical className="w-4 h-4"/>
                </div>

                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    {isActive
                        ? <Loader2 className={`w-4 h-4 ${cfg.color} animate-spin`}/>
                        : isCompleted
                            ? <CheckCircle2 className={`w-4 h-4 ${cfg.color}`}/>
                            : item.status === 'error'
                                ? <AlertCircle className={`w-4 h-4 ${cfg.color}`}/>
                                : <FileVideo className={`w-4 h-4 ${cfg.color}`}/>
                    }
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{formatFileSize(item.file.size)}</span>
                        <span className={`text-xs font-semibold ${cfg.color}`}>
                            {item.status === 'uploading' ? `${item.progress}%` : cfg.label}
                        </span>
                    </div>
                    {item.error && item.error !== 'Cancelled' && (
                        <p className="text-xs text-red-500 mt-0.5 leading-tight">{item.error}</p>
                    )}
                    {isActive && (
                        <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{width: `${item.progress}%`, background: 'linear-gradient(90deg, #3b82f6, #6366f1)'}}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === 'error' && (
                        <button onClick={onRetry} className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center active:bg-blue-100">
                            <RotateCcw className="w-3.5 h-3.5 text-blue-600"/>
                        </button>
                    )}
                    {canControl && (
                        <button onClick={onRemove} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center active:bg-slate-200">
                            <X className="w-3.5 h-3.5 text-slate-500"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const InspectionForm = () => {
    const {locale: language} = useLocale();
    const {data: session} = useSession();
    const {report, updateReport} = useNewReport();
    const {t} = useTranslations('inspection');
    const router = useRouter();
    const currentUser: any = session?.user || {};

    const safeReport = report || {};
    const [activeTab, setActiveTab] = useState('live');
    const {data: propertyData} = usePropertyListQuery();
    const properties = propertyData?.items || [];

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const pdfInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const floorplanInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);

    // ── Cover photo (native file input) ──────────────────────────────────────
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState('');

    // ── Floorplan (native file input, multiple) ───────────────────────────────
    const [floorplanFiles, setFloorplanFiles] = useState<File[]>([]);
    const [floorplanPreviews, setFloorplanPreviews] = useState<string[]>([]);

    // ── Offline upload state ──────────────────────────────────────────────────
    const [analysisFinished, setAnalysisFinished] = useState(false);
    const [offlineError, setOfflineError] = useState<string | null>(null);
    const [showBackgroundModal, setShowBackgroundModal] = useState(false);
    const [offlineStatusStep, setOfflineStatusStep] = useState(0);
    // 0=idle, 1=creating, 2=uploading, 3=merging, 4=analyzing

    // Collect completed video URLs during upload (ref avoids stale closure)
    const completedUrlsRef = useRef<Array<{ url: string; mimeType: string; index: number }>>([]);

    const {
        files: videoFiles,
        addFiles,
        removeFile,
        retryFile,
        reorderFiles,
        clearAll: clearVideoFiles,
        startUpload,
        isUploading,
        hasFiles,
        pendingCount,
        completedCount,
        errorCount,
        activeCount,
        totalSize,
    } = useVideoUploadQueue({
        maxConcurrentFiles: 3,
        maxConcurrentChunks: 2,
        saveDir: 'videos',
        onFileCompleted: (item, videoData) => {
            const url = videoData.url || videoData.path || '';
            completedUrlsRef.current.push({url, mimeType: item.file.type, index: item.file_index});
        }
    });

    const overallUploadProgress = videoFiles.length > 0
        ? Math.floor(videoFiles.reduce((sum, f) => sum + f.progress, 0) / videoFiles.length)
        : 0;

    const currentProperty = useMemo(() => {
        return properties.find((p: any) => p.id == safeReport.propertyId);
    }, [properties, safeReport.propertyId]);

    // ── Cover photo handlers ──────────────────────────────────────────────────

    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
        setCoverFile(file);
        setCoverPreviewUrl(URL.createObjectURL(file));
        e.target.value = '';
    };

    const removeCover = () => {
        if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
        setCoverFile(null);
        setCoverPreviewUrl('');
        updateReport({propertyCoverImage: null});
    };

    // ── Floorplan handlers ────────────────────────────────────────────────────

    const handleFloorplanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const previews = files.map(f => URL.createObjectURL(f));
        setFloorplanFiles(prev => [...prev, ...files]);
        setFloorplanPreviews(prev => [...prev, ...previews]);
        e.target.value = '';
    };

    const removeFloorplan = (idx: number) => {
        URL.revokeObjectURL(floorplanPreviews[idx]);
        setFloorplanFiles(prev => prev.filter((_, i) => i !== idx));
        setFloorplanPreviews(prev => prev.filter((_, i) => i !== idx));
    };

    // ── Offline multi-video upload flow ───────────────────────────────────────

    const handleOfflineUpload = async () => {
        if (!hasFiles) {
            alert(language === 'zh' ? '请先选择视频文件' : 'Please select at least one video file');
            return;
        }

        setOfflineError(null);
        completedUrlsRef.current = [];

        try {
            // Step 1: Create inspection draft
            setOfflineStatusStep(1);
            const {propertyId, propertyAddress, notes, pdfFile} = safeReport;
            const formData = new FormData();
            formData.append('status', 'draft');
            formData.append('video_status', 'draft');
            formData.append('is_new', '1');
            if (propertyId) formData.append('property_id', propertyId);
            if (propertyAddress) formData.append('property_address', propertyAddress);
            if (coverFile) formData.append('image', coverFile);
            else if (safeReport.propertyCoverImage) formData.append('image', safeReport.propertyCoverImage);
            if (notes) formData.append('subtext', notes);
            if (pdfFile) formData.append('pdfFile', pdfFile);
            floorplanFiles.forEach(f => formData.append('room_images[]', f));
            const inspectionData = await apiPost('/inspections', formData);
            const inspectionId = inspectionData.id;

            // Step 2: Upload all videos (with per-file progress in overlay)
            setOfflineStatusStep(2);
            await startUpload();

            if (completedUrlsRef.current.length === 0) {
                throw new Error(language === 'zh' ? '没有视频上传成功，请重试' : 'No videos uploaded successfully. Please retry.');
            }

            // Step 3: Merge videos
            setOfflineStatusStep(3);
            const videoSources = completedUrlsRef.current
                .sort((a, b) => a.index - b.index)
                .map(v => ({src: v.url, mime_type: v.mimeType}));
            await apiPost(`/inspections/${inspectionId}/videos/merge`, {videos: videoSources});

            // Step 4: AI analysis
            setOfflineStatusStep(4);
            await apiPost(`/inspections/${inspectionId}/analyze`);

            setTimeout(() => {
                setOfflineStatusStep(0);
                setAnalysisFinished(true);
                setShowBackgroundModal(true);
            }, 1000);

        } catch (err: any) {
            console.error(err);
            setOfflineError(err.message || 'Error during upload and analysis. Please try again.');
            setOfflineStatusStep(0);
        }
    };

    // ── Live inspection start ─────────────────────────────────────────────────

    const handleStart = async () => {
        try {
            setIsProcessing(true);
            const {propertyId, propertyAddress, notes, pdfFile} = safeReport;
            const formData = new FormData();
            formData.append('status', 'draft');
            if (propertyId) formData.append('propertyId', propertyId);
            if (propertyAddress) formData.append('propertyAddress', propertyAddress);
            if (coverFile) formData.append('propertyCoverImage', coverFile);
            else if (safeReport.propertyCoverImage) formData.append('propertyCoverImage', safeReport.propertyCoverImage);
            if (notes) formData.append('notes', notes);
            if (pdfFile) formData.append('pdfFile', pdfFile);
            floorplanFiles.forEach(f => formData.append('imageFiles[]', f));
            const {knowledgeBase, inspection_id} = await apiPost('/gemini/inspections/pre-process', formData);
            if (knowledgeBase) {
                localStorage.setItem('pre_inspection_kb', knowledgeBase);
            } else {
                localStorage.removeItem('pre_inspection_kb');
            }
            router.push(`/inspection/${inspection_id}/live`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (currentProperty) {
            updateReport({propertyAddress: currentProperty.name});
            if (!safeReport.propertyCoverImage && !coverFile) {
                updateReport({propertyCoverImage: currentProperty.image});
            }
            if (autocompleteRef.current) autocompleteRef.current.value = currentProperty.name || '';
        }
    }, [currentProperty]);

    const displayCoverUrl = coverPreviewUrl || safeReport.propertyCoverImage;
    const isSubmitting = offlineStatusStep > 0;

    const canDragSort = !isSubmitting && !isUploading && pendingCount > 0;

    const handleSortEnd = useCallback((oldIndex: number, newIndex: number) => {
        reorderFiles(oldIndex, newIndex);
    }, [reorderFiles]);

    return (
        <>
            <div className="flex-1 w-full max-w-md mx-auto px-4 flex flex-col gap-4 pt-4 pb-24">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {language === 'zh' ? '新建巡检报告' : 'New Inspection'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {language === 'zh' ? '填写以下信息，AI将协助生成专业报告' : 'Fill in the details below to generate a professional report'}
                    </p>
                </div>

                {/* ── Inspector Profile Card ──────────────────────────────────── */}
                <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden p-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    {currentUser.name || (language === 'zh' ? '加载中...' : 'Loading...')}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                    {currentUser.company_name || 'Irish PropTech Agency'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={async () => { await signOut(); window.location.reload(); }}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-red-100"
                        >
                            <LogOut className="w-3.5 h-3.5"/>
                            {language === 'zh' ? '登出' : 'Log Out'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">
                                {language === 'zh' ? '电话' : 'Phone'}
                            </span>
                            <span className="text-xs text-slate-700 font-semibold">{currentUser.phone_number || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">
                                {language === 'zh' ? '邮箱' : 'Email'}
                            </span>
                            <span className="text-xs text-slate-700 font-semibold truncate block">{currentUser.email || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 col-span-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">
                                {language === 'zh' ? '参考编号' : 'Reference No.'}
                            </span>
                            <span className="text-xs text-slate-700 font-semibold">{currentUser.reference || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* ── Mode Tab Switcher ───────────────────────────────────────── */}
                <div className="flex bg-slate-200/60 p-1.5 rounded-2xl gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('live')}
                        className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all ${activeTab === 'live' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        🎙️ {language === 'zh' ? '实时语音巡检' : 'Live Voice Session'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('offline')}
                        className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all ${activeTab === 'offline' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        📁 {language === 'zh' ? '离线视频分析' : 'Offline Video Analysis'}
                    </button>
                </div>

                {/* ── Common Fields ───────────────────────────────────────────── */}
                <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-5 space-y-5 border border-slate-100">

                    {/* Property link */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <HomeIcon className="w-4 h-4 text-blue-500"/>
                            {language === 'zh' ? '调用旧房源记录 (可选)' : 'Link Previous Property (Optional)'}
                        </label>
                        <select
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 font-medium cursor-pointer"
                            value={safeReport.propertyId}
                            onChange={(e) => updateReport({propertyId: e.target.value})}
                        >
                            <option value="">
                                {language === 'zh' ? '-- 仅手动录入 --' : '-- Manual Entry Only --'}
                            </option>
                            {[...properties].map((prop) => (
                                <option key={prop.id} value={prop.id}>
                                    {prop.name} ({prop.type || 'HMO'})
                                </option>
                            ))}
                        </select>
                        {safeReport.propertyId && currentProperty && (
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-2 space-y-2 text-xs text-blue-700 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex justify-between items-center font-bold">
                                    <span>🔗 {language === 'zh' ? '已成功关联旧房源数据' : 'Property linked'}</span>
                                    <span className="font-mono">{report.propertyId}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-blue-600/80 pt-1">
                                    <div>🏠 {currentProperty?.type}</div>
                                    <div>📊 {currentProperty?.views || 0} {language === 'zh' ? '次历史巡检' : 'past visits'}</div>
                                    <div>🛏️ {currentProperty?.bedrooms || 0} Bed · 🛁 {currentProperty?.main_bathrooms || 0} Bath</div>
                                    <div>🍳 {currentProperty?.kitchen_type || 'Standard'}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-500"/>
                            {t('address_label')}
                        </label>
                        <Autocomplete
                            ref={autocompleteRef}
                            defaultValue={safeReport.propertyAddress}
                            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                            onPlaceSelected={(place) => {
                                const address = place.formatted_address || place.name;
                                updateReport({propertyAddress: address});
                            }}
                            onChange={(e: any) => updateReport({propertyAddress: e.target.value})}
                            options={{types: [], componentRestrictions: {country: ['ie', 'gb']}}}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                            placeholder={t('address_placeholder')}
                        />
                    </div>

                    {/* Cover Photo - native file input */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-blue-500"/>
                            {language === 'zh' ? '住宅封面照片' : 'Property Cover Photo'}
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={coverInputRef}
                            onChange={handleCoverFileChange}
                        />
                        {displayCoverUrl ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm animate-in fade-in zoom-in duration-200">
                                <img src={displayCoverUrl} alt="Cover" className="w-full h-44 object-cover"/>
                                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent"/>
                                <button
                                    onClick={removeCover}
                                    className="absolute top-3 right-3 w-8 h-8 bg-slate-900/60 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                                <button
                                    onClick={() => coverInputRef.current?.click()}
                                    className="absolute bottom-3 right-3 px-3.5 py-2 bg-white/95 backdrop-blur text-slate-800 text-xs font-bold rounded-xl hover:bg-white active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                                >
                                    <Camera className="w-3.5 h-3.5 text-blue-600"/>
                                    {language === 'zh' ? '重新选择' : 'Change'}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => coverInputRef.current?.click()}
                                className="w-full p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 group"
                            >
                                <div className="p-3 rounded-full bg-white text-slate-400 shadow-sm group-hover:text-blue-500 transition-colors">
                                    <Camera className="w-6 h-6"/>
                                </div>
                                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                                    {language === 'zh' ? '点击选择封面照片' : 'Select Cover Photo'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {language === 'zh' ? '可选 · JPG, PNG, HEIC' : 'Optional · JPG, PNG, HEIC'}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Notes & PDF */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500"/>
                            {t('notes_label')}
                        </label>
                        <textarea
                            rows={3}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 resize-none font-medium leading-relaxed"
                            placeholder={t('notes_placeholder')}
                            value={safeReport.notes}
                            onChange={e => updateReport({notes: e.target.value})}
                        />
                        <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            ref={pdfInputRef}
                            onChange={e => {
                                if (e.target.files?.[0]) updateReport({pdfFile: e.target.files[0]});
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => pdfInputRef.current?.click()}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] ${safeReport.pdfFile ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600'}`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${safeReport.pdfFile ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
                                <File className={`w-4 h-4 ${safeReport.pdfFile ? 'text-blue-600' : 'text-slate-400'}`}/>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-semibold leading-tight">
                                    {safeReport.pdfFile
                                        ? (language === 'zh' ? '已附加PDF报告' : 'PDF Report Attached')
                                        : (language === 'zh' ? '附加旧巡检报告（PDF）' : 'Attach Previous Report (PDF)')}
                                </p>
                                <p className="text-xs mt-0.5 truncate opacity-70">
                                    {safeReport.pdfFile ? safeReport.pdfFile.name : (language === 'zh' ? '可选 · 帮助AI了解历史记录' : 'Optional · Helps AI understand history')}
                                </p>
                            </div>
                            {safeReport.pdfFile && (
                                <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); updateReport({pdfFile: null}); }}
                                    className="shrink-0 w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-500 hover:bg-red-200 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5"/>
                                </button>
                            )}
                        </button>
                    </div>

                    {/* Floorplan - native file input */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">{t('upload_floorplan')}</label>
                        <p className="text-xs text-slate-500">{t('upload_desc')}</p>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            ref={floorplanInputRef}
                            onChange={handleFloorplanChange}
                        />
                        {floorplanFiles.length > 0 ? (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {floorplanPreviews.map((url, idx) => (
                                        <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                            <img src={url} className="w-full h-full object-cover" alt=""/>
                                            <button
                                                onClick={() => removeFloorplan(idx)}
                                                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
                                            >
                                                <X className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => floorplanInputRef.current?.click()}
                                        className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                                    >
                                        <Plus className="w-5 h-5"/>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { floorplanPreviews.forEach(u => URL.revokeObjectURL(u)); setFloorplanFiles([]); setFloorplanPreviews([]); }}
                                    className="text-xs font-semibold text-red-500 hover:text-red-600"
                                >
                                    {language === 'zh' ? '清除全部' : 'Remove all'}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => floorplanInputRef.current?.click()}
                                className="w-full p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98]"
                            >
                                <div className="p-3 rounded-full mb-2 bg-white text-slate-400 shadow-sm group-hover:text-blue-500 transition-colors">
                                    <UploadCloud className="w-5 h-5"/>
                                </div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700 transition-colors">
                                    {language === 'zh' ? '点击选择平面图' : 'Select Floorplan Images'}
                                </span>
                                <span className="text-[11px] text-slate-400 mt-1">
                                    {language === 'zh' ? '支持多张选择' : 'Multiple images supported'}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* ── Live Mode: Start Button ─────────────────────────────── */}
                    {activeTab === 'live' && (
                        <button
                            onClick={handleStart}
                            disabled={isProcessing}
                            className="group relative w-full flex items-center justify-center gap-2 py-4 px-6 bg-slate-900 text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {!isProcessing && (
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent"/>
                            )}
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin"/>
                                    <span>Synthesizing Knowledge Base...</span>
                                </>
                            ) : (
                                <>
                                    <span>{t('start_btn')}</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                                </>
                            )}
                        </button>
                    )}

                    {/* ── Offline Mode: Video Queue + Upload ─────────────────── */}
                    {activeTab === 'offline' && (
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Video className="w-4 h-4 text-blue-500"/>
                                {language === 'zh' ? '选择巡检视频（支持多选）' : 'Select Walkthrough Videos'}
                            </label>
                            <p className="text-xs text-slate-500 -mt-1">
                                {language === 'zh' ? '上传离线拍摄的现场巡检视频，支持批量上传，可调整合并顺序' : 'Upload recorded inspection videos. Multiple files supported — drag to reorder before merging.'}
                            </p>
                            <input
                                type="file"
                                accept="video/*"
                                multiple
                                className="hidden"
                                ref={videoInputRef}
                                onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
                            />

                            {/* File queue */}
                            {hasFiles ? (
                                <div>
                                    {/* Summary bar */}
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <span className="text-xs text-slate-500">
                                            {videoFiles.length} {language === 'zh' ? '个视频' : 'videos'} · {formatFileSize(totalSize)}
                                        </span>
                                        <div className="flex items-center gap-3 text-xs">
                                            {activeCount > 0 && <span className="text-blue-600 font-semibold">{activeCount} uploading</span>}
                                            {completedCount > 0 && <span className="text-emerald-600 font-semibold">{completedCount} done</span>}
                                            {errorCount > 0 && <span className="text-red-500 font-semibold">{errorCount} failed</span>}
                                        </div>
                                    </div>

                                    <SortableProvider onSortEnd={handleSortEnd}>
                                        {videoFiles.map((item, index) => (
                                            <MobileVideoItem
                                                key={item.id}
                                                item={item}
                                                index={index}
                                                canDrag={canDragSort}
                                                onRemove={() => removeFile(item.id)}
                                                onRetry={() => retryFile(item.id)}
                                            />
                                        ))}
                                    </SortableProvider>

                                    {/* Add more */}
                                    {!isSubmitting && (
                                        <button
                                            type="button"
                                            onClick={() => videoInputRef.current?.click()}
                                            className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 font-semibold flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-500 transition-colors active:scale-[0.98] mt-1"
                                        >
                                            <Plus className="w-4 h-4"/>
                                            {language === 'zh' ? '添加更多视频' : 'Add more videos'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => videoInputRef.current?.click()}
                                    className="w-full p-8 border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group active:scale-[0.98]"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:text-blue-500 text-slate-400 transition-colors">
                                        <UploadCloud className="w-7 h-7"/>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                                        {language === 'zh' ? '选择现场录像视频' : 'Select Walkthrough Videos'}
                                    </span>
                                    <span className="text-xs text-slate-400 mt-1">
                                        MP4, MOV, WebM · {language === 'zh' ? '支持多选' : 'multiple selection'}
                                    </span>
                                </button>
                            )}

                            {/* Error message */}
                            {offlineError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/>
                                    <p className="text-sm text-red-600 leading-snug">{offlineError}</p>
                                </div>
                            )}

                            {/* Upload & Analyze button */}
                            <button
                                onClick={handleOfflineUpload}
                                disabled={!hasFiles || isSubmitting}
                                className="group relative w-full flex items-center justify-center gap-2 py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent"/>
                                <UploadCloud className="w-5 h-5 shrink-0"/>
                                <span>
                                    {language === 'zh' ? '上传并开始多模态分析' : 'Upload & Start Multimodal Analysis'}
                                </span>
                                {hasFiles && pendingCount > 0 && (
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Camera Modal ────────────────────────────────────────────────── */}
            {isCameraOpen && (
                <ModalCamera
                    onClose={() => setIsCameraOpen(false)}
                    onCapture={dataUrl => updateReport({coverPhotoDataUrl: dataUrl})}
                />
            )}

            {/* ── Upload Progress Overlay ─────────────────────────────────────── */}
            {isSubmitting && !analysisFinished && (
                <div className="fixed inset-0 z-[200] bg-slate-900/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white">
                    <div className="bg-slate-800/80 border border-slate-700/50 rounded-3xl p-6 w-full max-w-sm space-y-5 flex flex-col items-center shadow-2xl animate-in fade-in zoom-in duration-200">

                        {/* Step 2 (uploading): circle progress */}
                        {offlineStatusStep === 2 ? (
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" className="stroke-slate-700" strokeWidth="6" fill="transparent"/>
                                    <circle
                                        cx="50" cy="50" r="42"
                                        className="stroke-blue-500 transition-all duration-300 ease-out"
                                        strokeWidth="6" fill="transparent"
                                        strokeDasharray={263.9}
                                        strokeDashoffset={263.9 - (263.9 * overallUploadProgress) / 100}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute text-xl font-extrabold">{overallUploadProgress}%</span>
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-blue-400 animate-spin"/>
                            </div>
                        )}

                        {/* Step labels */}
                        <div className="text-center space-y-1">
                            <h3 className="text-base font-bold tracking-tight">
                                {offlineStatusStep === 1 && (language === 'zh' ? '正在创建巡检记录...' : 'Creating inspection...')}
                                {offlineStatusStep === 2 && (language === 'zh' ? `正在上传视频 (${completedCount}/${videoFiles.length})` : `Uploading videos (${completedCount}/${videoFiles.length})`)}
                                {offlineStatusStep === 3 && (language === 'zh' ? '正在合并视频文件...' : 'Merging video files...')}
                                {offlineStatusStep === 4 && (language === 'zh' ? 'Gemini AI 正在分析...' : 'Gemini AI analyzing...')}
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed px-2">
                                {offlineStatusStep === 1 && (language === 'zh' ? '正在初始化巡检记录...' : 'Initializing inspection record...')}
                                {offlineStatusStep === 2 && (language === 'zh' ? '视频正在以切片形式高速传输至服务器' : 'Transferring files in chunks to server')}
                                {offlineStatusStep === 3 && (language === 'zh' ? '正在将多段视频按顺序拼接合并...' : 'Combining video segments in order...')}
                                {offlineStatusStep === 4 && (language === 'zh' ? '正在听取解说音频并融合画面细节，约需1-2分钟' : 'Listening to narration & checking visuals — ~1-2 mins')}
                            </p>
                        </div>

                        {/* Per-file mini list for step 2 */}
                        {offlineStatusStep === 2 && videoFiles.length > 0 && (
                            <div className="w-full space-y-1.5 max-h-40 overflow-y-auto">
                                {videoFiles.map(f => {
                                    const cfg = STATUS_CONFIG[f.status];
                                    return (
                                        <div key={f.id} className="flex items-center gap-2 text-xs">
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.status === 'completed' ? 'bg-emerald-400' : f.status === 'error' ? 'bg-red-400' : f.status === 'uploading' ? 'bg-blue-400' : 'bg-slate-500'}`}/>
                                            <span className="flex-1 truncate text-slate-300">{f.file.name}</span>
                                            <span className={cfg.color}>{f.status === 'uploading' ? `${f.progress}%` : cfg.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Steps indicator */}
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4].map(step => (
                                <div
                                    key={step}
                                    className={`rounded-full transition-all duration-300 ${step === offlineStatusStep ? 'w-6 h-2 bg-blue-400' : step < offlineStatusStep ? 'w-2 h-2 bg-blue-400/50' : 'w-2 h-2 bg-slate-600'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Success Modal ───────────────────────────────────────────────── */}
            {analysisFinished && (
                <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-6 flex flex-col items-center animate-in fade-in zoom-in duration-200 text-slate-900">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-md">
                            <Check className="w-8 h-8" strokeWidth={3}/>
                        </div>
                        <div className="space-y-2 text-center">
                            <h3 className="text-2xl font-black tracking-tight">
                                {language === 'zh' ? '分析并同步成功！' : 'Analysis Complete!'}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed px-2">
                                {language === 'zh'
                                    ? 'Gemini AI 成功分析视频，巡检报告已实时同步至 PC 仪表盘！'
                                    : 'Gemini AI successfully analyzed the video. Report synced to the dashboard!'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => { setAnalysisFinished(false); clearVideoFiles(); window.location.reload(); }}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                {language === 'zh' ? '好的，开始下一场' : 'Great, inspect next'}
                            </button>
                            <a
                                href="/"
                                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-center block text-sm active:scale-95"
                            >
                                🖥️ {language === 'zh' ? '前往 PC 大屏端查看' : 'Go to Dashboard'}
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Background Modal (kept for backward compat) ──────────────── */}
            {showBackgroundModal && (
                <div className="fixed inset-0 z-[210] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-linear-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-6 flex flex-col items-center animate-in fade-in zoom-in duration-200 text-white text-center">
                        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center shadow-lg border border-blue-500/30 animate-pulse">
                            <UploadCloud className="w-8 h-8" strokeWidth={2.5}/>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tight">
                                {language === 'zh' ? '视频上传成功！' : 'Upload Successful!'}
                            </h3>
                            <p className="text-sm text-slate-300 leading-relaxed px-1">
                                {language === 'zh'
                                    ? 'AI 正在后台自动执行音视频深度分析，您可以放心关闭此页面。'
                                    : 'AI is analyzing the walkthrough in the background. You can safely close this page.'}
                            </p>
                            <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-2xl border border-slate-800 mt-2">
                                {language === 'zh'
                                    ? '⏳ 耗时约 1-2 分钟，分析完成后报告将自动同步至 PC 大屏。'
                                    : '⏳ Takes ~1-2 mins. Report will auto-sync to the PC Dashboard.'}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowBackgroundModal(false)}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/20 active:scale-95 text-sm"
                        >
                            {language === 'zh' ? '我知道了 (安全退出)' : 'Got it (Safe to Exit)'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default InspectionForm;
