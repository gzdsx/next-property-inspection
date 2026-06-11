'use client';

import {useState, useRef, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {
    MapPin, FileText, UploadCloud, ArrowRight, Home as HomeIcon,
    File, Loader2, Camera, User, Check, X, LogOut
} from 'lucide-react';
import Autocomplete from 'react-google-autocomplete';
import type {InspectorProfile} from '@/lib/generateReport';
import {apiGet} from "@/lib/api";
import LangSwitchButton from "@/components/frontend/LangSwitchButton";
import {useLocale, useTranslations} from "@/contexts/LocaleContext";
import {useSession} from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

const PROFILE_KEY = 'inspector_profile';
const COVER_PHOTO_KEY = 'property_cover_photo';

const DEFAULT_PROFILE: InspectorProfile = {
    companyName: '',
    inspectorName: '',
    phone: '',
    email: '',
    reference: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

const getAddressSimilarity = (addr1: string, addr2: string): number => {
    const cleanAndTokenize = (str: string) => {
        return str
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
            .split(/\s+/)
            .filter(w => w.length > 1);
    };

    const tokens1 = cleanAndTokenize(addr1 || "");
    const tokens2 = cleanAndTokenize(addr2 || "");

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    let matches = 0;
    const set2 = new Set(tokens2);
    for (const token of tokens1) {
        if (set2.has(token)) {
            matches++;
        }
    }

    return matches / Math.max(tokens1.length, tokens2.length);
};

export default function Home() {
    const {data: session} = useSession();
    const {locale: language, setLocale: setLanguage} = useLocale();
    const {t} = useTranslations('inspection');
    const router = useRouter();

    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);

    const [properties, setProperties] = useState<any[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

    // 新增 Tab 状态：'live' (实时音频) 或 'offline' (离线视频上传)
    const [activeTab, setActiveTab] = useState<'live' | 'offline'>('live');
    // 新增离线视频状态和 refs
    const [offlineVideoFile, setOfflineVideoFile] = useState<File | null>(null);
    const [offlineStatusStep, setOfflineStatusStep] = useState<number>(0); // 0=idle, 1=uploading, 2=analyzing, 3=finalizing
    const [offlineProgress, setOfflineProgress] = useState<number>(0);
    const [analysisFinished, setAnalysisFinished] = useState<boolean>(false);
    const [createdReportId, setCreatedReportId] = useState<string>('');
    const [offlineError, setOfflineError] = useState<string | null>(null);
    const [offlineRecordCount, setOfflineRecordCount] = useState<number>(0);
    const [showBackgroundModal, setShowBackgroundModal] = useState<boolean>(false);

    const [profile, setProfile] = useState<InspectorProfile>(DEFAULT_PROFILE);
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);

    // Login States
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');

    const [coverPhotoDataUrl, setCoverPhotoDataUrl] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);

    const [isHoveringUpload, setIsHoveringUpload] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showResumeModal, setShowResumeModal] = useState(false);

    const pdfInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // ── Load persisted data ──────────────────────────────────────────────────
    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/inspector-profile');
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setProfileSaved(true);
            }
        } catch (e) {
        }
    };

    const fetchProperties = async () => {
        try {
            const response = await apiGet(`/inspection/properties`);
            setProperties(response.data.items);
        } catch (e) {
        }
    }

    useEffect(() => {
        fetchProfile();
        fetchProperties();

        // Load cover photo
        try {
            const saved = localStorage.getItem(COVER_PHOTO_KEY);
            if (saved) setCoverPhotoDataUrl(saved);
        } catch {
        }

        // Check for unfinished session
        const hasKb = localStorage.getItem('pre_inspection_kb');
        const hasRecords = localStorage.getItem('inspection_records');
        if (hasKb || (hasRecords && hasRecords !== '[]')) {
            setShowResumeModal(true);
        }
    }, []);

    // ── Profile helpers ──────────────────────────────────────────────────────
    const saveProfile = () => {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        setProfileSaved(true);
        setProfileOpen(false);
    };

    const updateProfile = (field: keyof InspectorProfile, value: string) => {
        setProfile(prev => ({...prev, [field]: value}));
        setProfileSaved(false);
    };

    // ── Cover photo helpers ──────────────────────────────────────────────────
    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {facingMode: 'environment'}
            });
            setCameraStream(stream);
            setIsCameraOpen(true);
            setTimeout(() => {
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = stream;
                }
            }, 100);
        } catch {
            // Fallback to file picker if camera not available
            coverFileInputRef.current?.click();
        }
    };

    const capturePhoto = () => {
        const video = videoPreviewRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCoverPhotoDataUrl(dataUrl);
        localStorage.setItem(COVER_PHOTO_KEY, dataUrl);
        closeCamera();
    };

    const closeCamera = () => {
        cameraStream?.getTracks().forEach(t => t.stop());
        setCameraStream(null);
        setIsCameraOpen(false);
    };

    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setCoverPhotoDataUrl(dataUrl);
            localStorage.setItem(COVER_PHOTO_KEY, dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const removeCoverPhoto = () => {
        setCoverPhotoDataUrl(null);
        localStorage.removeItem(COVER_PHOTO_KEY);
    };

    // ── Resume modal ─────────────────────────────────────────────────────────
    const handleResume = (resume: boolean) => {
        if (resume) {
            router.push('/inspection');
        } else {
            localStorage.removeItem('pre_inspection_kb');
            localStorage.removeItem('inspection_records');
            removeCoverPhoto();
            setShowResumeModal(false);
        }
    };

    // ── Start inspection ─────────────────────────────────────────────────────
    const handleStart = async () => {
        let finalAddress = address;
        if (selectedPropertyId && !address) {
            const selectedProp = properties.find(p => p.id === selectedPropertyId);
            if (selectedProp) {
                finalAddress = selectedProp.name;
                setAddress(selectedProp.name);
            }
        }

        // Save address to localStorage for PDF
        if (selectedPropertyId) localStorage.setItem('inspection_property_id', selectedPropertyId);
        if (finalAddress) localStorage.setItem('inspection_address', finalAddress);

        if (!selectedPropertyId && !finalAddress && !notes && !pdfFile && imageFiles.length === 0) {
            localStorage.removeItem('pre_inspection_kb');
            router.push('/inspection/live');
            return;
        }

        setIsProcessing(true);
        try {
            const formData = new FormData();
            if (selectedPropertyId) formData.append('propertyId', selectedPropertyId);
            if (finalAddress) formData.append('address', finalAddress);
            if (notes) formData.append('notes', notes);
            if (pdfFile) formData.append('pdf', pdfFile);
            imageFiles.forEach(file => formData.append('images', file));

            const res = await fetch('/api/genai/pre-process', {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('Failed to pre-process data');
            const data = await res.json();

            if (data.knowledgeBase) {
                localStorage.setItem('pre_inspection_kb', data.knowledgeBase);
            } else {
                localStorage.removeItem('pre_inspection_kb');
            }
            router.push('/inspection/live');
        } catch (err) {
            console.error(err);
            alert('Error analyzing files. Please try again or skip file upload.');
            setIsProcessing(false);
        }
    };

    // ── Offline Video Upload & Analysis ─────────────────────────────────────
    const handleOfflineUpload = async () => {
        if (!offlineVideoFile) {
            alert(language === 'zh' ? '请先选择视频文件' : 'Please select a video file first');
            return;
        }

        // 保存地址用于PDF封面生成等
        if (address) localStorage.setItem('inspection_address', address);

        setOfflineError(null);
        setOfflineStatusStep(1); // 1 = 正在上传
        setOfflineProgress(12);

        try {
            const formData = new FormData();
            formData.append('video', offlineVideoFile);
            if (address) formData.append('address', address);
            if (profile.inspectorName) formData.append('inspectorName', profile.inspectorName);
            if (profile.companyName) formData.append('companyName', profile.companyName);
            if (profile.phone) formData.append('phone', profile.phone);
            if (profile.email) formData.append('email', profile.email);
            if (profile.reference) formData.append('reference', profile.reference);
            if (coverPhotoDataUrl) formData.append('coverPhoto', coverPhotoDataUrl);

            // 模拟上传进度动画让体验极佳
            const interval = setInterval(() => {
                setOfflineProgress(prev => {
                    if (prev >= 92) {
                        clearInterval(interval);
                        return 92;
                    }
                    return prev + Math.floor(Math.random() * 8) + 4;
                });
            }, 300);

            // 发送至离线视频处理 API
            const res = await fetch('/api/genai/analyze-video', {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);
            setOfflineProgress(100);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Video analysis background task creation failed');
            }

            const data = await res.json();
            setCreatedReportId(data.jobId); // 使用 jobId 作为创建报告的标识

            setTimeout(() => {
                setOfflineStatusStep(0); // 重置进度条
                setShowBackgroundModal(true); // 弹窗提示：视频已上传成功，AI正在后台分析
            }, 600);

        } catch (err: any) {
            console.error(err);
            setOfflineError(err.message || 'Error uploading video file. Please try again.');
            setOfflineStatusStep(0);
        }
    };

    return (
        <main className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">

            {/* Resume Modal */}
            {showResumeModal && (
                <div
                    className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
                    <div
                        className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-slate-900 text-center">
                            {language === 'zh' ? '发现未完成的巡检记录' : 'Unfinished Inspection Found'}
                        </h3>
                        <p className="text-sm text-slate-500 text-center leading-relaxed">
                            {language === 'zh'
                                ? '系统检测到您之前有上传过知识库或未完成的巡检记录。是否直接继续？'
                                : 'The system detected a previously uploaded knowledge base or unfinished records. Do you want to resume?'}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => handleResume(true)}
                                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors shadow-md shadow-blue-500/20">
                                {language === 'zh' ? '是的，继续巡检' : 'Yes, resume work'}
                            </button>
                            <button onClick={() => handleResume(false)}
                                    className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors">
                                {language === 'zh' ? '不，清除并重新开始' : 'No, start fresh'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Overlay */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-[150] bg-black flex flex-col">
                    <div className="flex-1 relative overflow-hidden">
                        <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 border-4 border-white/20 pointer-events-none rounded-2xl m-4"/>
                    </div>
                    <div className="flex-shrink-0 bg-black p-6 flex items-center justify-center gap-6">
                        <button onClick={closeCamera}
                                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                            <X className="w-5 h-5 text-white"/>
                        </button>
                        <button
                            onClick={capturePhoto}
                            className="w-20 h-20 rounded-full bg-white border-4 border-white/30 flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                        >
                            <div className="w-14 h-14 rounded-full bg-white"/>
                        </button>
                        <div className="w-12 h-12"/>
                        {/* spacer */}
                    </div>
                </div>
            )}

            {/* Header */}
            <header
                className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                        <HomeIcon className="w-5 h-5 text-white" strokeWidth={2.5}/>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-slate-900 to-slate-700 tracking-tight">
                            {t('appTitle')}
                        </h1>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{t('appSubtitle')}</p>
                    </div>
                </div>
                <LangSwitchButton/>
            </header>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-md mx-auto p-6 flex flex-col gap-5 pt-6 pb-16">

                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {language === 'zh' ? '新建巡检报告' : 'New Inspection'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {language === 'zh' ? '填写以下信息，AI将协助生成专业报告' : 'Fill in the details below to generate a professional report'}
                    </p>
                </div>

                {/* ── INSPECTOR PROFILE CARD (READ ONLY ACCOUNT DETAIL) ────────────────── */}
                <div
                    className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden p-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    {profile.inspectorName || (language === 'zh' ? '加载中...' : 'Loading...')}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                    {profile.companyName || 'Irish PropTech Agency'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                localStorage.removeItem('mobile_logged_in');
                                setIsLoggedIn(false);
                            }}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-red-100"
                        >
                            <LogOut className="w-3.5 h-3.5"/>
                            {language === 'zh' ? '登出' : 'Log Out'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                            <span
                                className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">{language === 'zh' ? '电话' : 'Phone'}</span>
                            <span className="text-xs text-slate-700 font-semibold">{profile.phone || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                            <span
                                className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">{language === 'zh' ? '邮箱' : 'Email'}</span>
                            <span
                                className="text-xs text-slate-700 font-semibold truncate block">{profile.email || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 col-span-2">
                            <span
                                className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">{language === 'zh' ? '参考编号' : 'Reference No.'}</span>
                            <span className="text-xs text-slate-700 font-semibold">{profile.reference || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Dual Mode Switcher Tab */}
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

                {activeTab === 'live' ? (
                    <>
                        {/* ── PROPERTY INFO CARD (LIVE) ─────────────────────────────────────────────── */}
                        <div
                            className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-5 space-y-5 border border-slate-100">

                            {/* Address Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500"/>
                                    {t('address_label')}
                                </label>
                                <Autocomplete
                                    key={selectedPropertyId}
                                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                    onPlaceSelected={(place) => {
                                        if (place.formatted_address) setAddress(place.formatted_address);
                                        else if (place.name) setAddress(place.name);
                                    }}
                                    options={{types: [], componentRestrictions: {country: ['ie', 'gb']}}}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                                    placeholder={t('address_placeholder')}
                                    defaultValue={address}
                                    onChange={(e: any) => setAddress(e.target.value)}
                                />
                            </div>

                            {/* Load Previous Property Record Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <HomeIcon className="w-4 h-4 text-blue-500"/>
                                    {language === 'zh' ? '调用旧房源记录 (可选)' : 'Link Previous Property (Optional)'}
                                </label>
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 font-medium cursor-pointer"
                                    value={selectedPropertyId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedPropertyId(val);
                                        if (val) {
                                            const selectedProp = properties.find(p => p.id === val);
                                            if (selectedProp) {
                                                setAddress(selectedProp.name);

                                                // Resolve cover photo exactly like the PC dashboard does
                                                let resolvedImage = selectedProp.image || '';
                                                if (!resolvedImage && selectedProp.drafts) {
                                                    const completedVisits = selectedProp.drafts.filter((d: any) => d.status === "Completed") || [];
                                                    if (completedVisits.length > 0) {
                                                        const latestCompletedVisit = [...completedVisits].sort(
                                                            (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
                                                        )[0];
                                                        if (latestCompletedVisit?.reportId) {
                                                            resolvedImage = `/uploads/${latestCompletedVisit.reportId}_cover.jpg`;
                                                        }
                                                    }
                                                }

                                                if (resolvedImage) {
                                                    setCoverPhotoDataUrl(resolvedImage);
                                                    localStorage.setItem(COVER_PHOTO_KEY, resolvedImage);
                                                } else {
                                                    setCoverPhotoDataUrl(null);
                                                    localStorage.removeItem(COVER_PHOTO_KEY);
                                                }
                                            }
                                        } else {
                                            // Switch to manual mode: clear cover photo if it was auto-loaded
                                            setCoverPhotoDataUrl(null);
                                            localStorage.removeItem(COVER_PHOTO_KEY);
                                        }
                                    }}
                                >
                                    <option value="">
                                        {language === 'zh' ? '-- 仅手动录入 --' : '-- Manual Entry Only --'}
                                    </option>
                                    {[...properties]
                                        .sort((a, b) => {
                                            if (!address) return 0;
                                            const scoreA = getAddressSimilarity(address, a.name);
                                            const scoreB = getAddressSimilarity(address, b.name);
                                            return scoreB - scoreA;
                                        })
                                        .map((prop) => (
                                            <option key={prop.id} value={prop.id}>
                                                {prop.name} ({prop.type || 'HMO'})
                                            </option>
                                        ))}
                                </select>

                                {selectedPropertyId && (
                                    <div
                                        className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-2 space-y-2 text-xs text-blue-700 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex justify-between items-center font-bold">
                                            <span>🔗 {language === 'zh' ? '已成功关联旧房源数据' : 'Successfully linked property records'}</span>
                                            <span
                                                className="font-mono">{selectedPropertyId.replace('prop_', '#')}</span>
                                        </div>
                                        {properties.find(p => p.id === selectedPropertyId) && (
                                            <div className="grid grid-cols-2 gap-2 text-blue-600/80 pt-1">
                                                <div>🏠 {properties.find(p => p.id === selectedPropertyId)?.type}</div>
                                                <div>📊 {properties.find(p => p.id === selectedPropertyId)?.visitCount || 0} {language === 'zh' ? '次历史巡检' : 'past visits'}</div>
                                                <div>🛏️ {properties.find(p => p.id === selectedPropertyId)?.rooms?.bedrooms || 0} Bed
                                                    ·
                                                    🛁 {properties.find(p => p.id === selectedPropertyId)?.rooms?.bathrooms || 0} Bath
                                                </div>
                                                <div>🍳 {properties.find(p => p.id === selectedPropertyId)?.rooms?.kitchenType || 'Standard'}</div>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-blue-500/75 italic mt-1">
                                            * {language === 'zh' ? 'AI 将在生成本次知识库时自动整合并载入该房产的历史房间构造与缺陷条目。' : 'AI will automatically synthesize historical room layout and defect logs for this walkthrough.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Property Cover Photo */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-blue-500"/>
                                    {language === 'zh' ? '住宅封面照片' : 'Property Cover Photo'}
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={coverFileInputRef}
                                    onChange={handleCoverFileChange}
                                />

                                {selectedPropertyId ? (
                                    // Linked property mode: unified single option
                                    coverPhotoDataUrl ? (
                                        <div
                                            className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm animate-in fade-in zoom-in duration-200">
                                            <img src={coverPhotoDataUrl} alt="Property exterior"
                                                 className="w-full h-44 object-cover"/>
                                            <div
                                                className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"/>

                                            {/* Top-right floating close button */}
                                            <button
                                                onClick={removeCoverPhoto}
                                                className="absolute top-3 right-3 w-8 h-8 bg-slate-900/60 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow"
                                                title={language === 'zh' ? '删除封面图' : 'Remove cover photo'}
                                            >
                                                <X className="w-4 h-4"/>
                                            </button>

                                            <div
                                                className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                        <span
                            className="text-white text-xs font-semibold bg-blue-600/85 backdrop-blur px-2.5 py-1.5 rounded-xl">
                          🏠 {language === 'zh' ? '已导入房源封面' : 'Loaded Record Cover'}
                        </span>
                                                <button
                                                    onClick={() => coverFileInputRef.current?.click()}
                                                    className="px-3.5 py-2 bg-white/95 backdrop-blur text-slate-800 text-xs font-bold rounded-xl hover:bg-white active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                                                >
                                                    <Camera className="w-3.5 h-3.5 text-blue-600"/>
                                                    {language === 'zh' ? '拍照或重新上传' : 'Retake / Re-upload'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => coverFileInputRef.current?.click()}
                                            className="w-full p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 group"
                                        >
                                            <div
                                                className="p-3 rounded-full bg-white text-slate-400 shadow-sm group-hover:text-blue-500 transition-colors">
                                                <Camera className="w-6 h-6"/>
                                            </div>
                                            <span
                                                className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                        {language === 'zh' ? '拍照或选择相册' : 'Take Photo or Select Gallery'}
                      </span>
                                            <span className="text-[10px] text-slate-400">
                        {language === 'zh' ? '可选 · 该房源记录无封面，点击手动上传' : 'Optional · No cover photo in record, click to add'}
                      </span>
                                        </button>
                                    )
                                ) : (
                                    // Manual Mode: separate options
                                    coverPhotoDataUrl ? (
                                        <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                                            <img src={coverPhotoDataUrl} alt="Property exterior"
                                                 className="w-full h-40 object-cover"/>
                                            <div
                                                className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"/>
                                            <div className="absolute bottom-2 right-2 flex gap-2">
                                                <button
                                                    onClick={openCamera}
                                                    className="px-3 py-1.5 bg-white/90 backdrop-blur text-slate-700 text-xs font-semibold rounded-xl hover:bg-white transition-colors shadow"
                                                >
                                                    {language === 'zh' ? '重拍' : 'Retake'}
                                                </button>
                                                <button
                                                    onClick={removeCoverPhoto}
                                                    className="px-3 py-1.5 bg-red-500/90 backdrop-blur text-white text-xs font-semibold rounded-xl hover:bg-red-500 transition-colors shadow"
                                                >
                                                    {language === 'zh' ? '删除' : 'Remove'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={openCamera}
                                                className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                            >
                                                <Camera
                                                    className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors"/>
                                                <span
                                                    className="text-xs text-slate-500 group-hover:text-blue-600 font-medium">
                          {language === 'zh' ? '拍照' : 'Take Photo'}
                        </span>
                                            </button>
                                            <button
                                                onClick={() => coverFileInputRef.current?.click()}
                                                className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                            >
                                                <UploadCloud
                                                    className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors"/>
                                                <span
                                                    className="text-xs text-slate-500 group-hover:text-blue-600 font-medium">
                          {language === 'zh' ? '从相册选择' : 'From Gallery'}
                        </span>
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Notes & PDF Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500"/>
                                    {t('notes_label')}
                                </label>
                                <textarea
                                    rows={3}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 resize-none font-medium leading-relaxed"
                                    placeholder={t('notes_placeholder')}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />

                                {/* PDF attachment — full-width tap target for mobile */}
                                <input
                                    type="file" accept="application/pdf" className="hidden" ref={pdfInputRef}
                                    onChange={e => {
                                        if (e.target.files?.[0]) setPdfFile(e.target.files[0]);
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => pdfInputRef.current?.click()}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98]
                    ${pdfFile
                                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                                        : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                                >
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pdfFile ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
                                        <File className={`w-4 h-4 ${pdfFile ? 'text-blue-600' : 'text-slate-400'}`}/>
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm font-semibold leading-tight">
                                            {pdfFile
                                                ? (language === 'zh' ? '已附加PDF报告' : 'PDF Report Attached')
                                                : (language === 'zh' ? '附加旧巡检报告（PDF）' : 'Attach Previous Report (PDF)')}
                                        </p>
                                        <p className="text-xs mt-0.5 truncate opacity-70">
                                            {pdfFile ? pdfFile.name : (language === 'zh' ? '可选 · 帮助AI了解历史记录' : 'Optional · Helps AI understand history')}
                                        </p>
                                    </div>
                                    {pdfFile && (
                                        <button
                                            type="button"
                                            onClick={e => {
                                                e.stopPropagation();
                                                setPdfFile(null);
                                            }}
                                            className="shrink-0 w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-500 hover:bg-red-200 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5"/>
                                        </button>
                                    )}
                                </button>
                            </div>

                            {/* Floorplan Upload */}
                            <div className="space-y-2">
                                <label
                                    className="text-sm font-semibold text-slate-700">{t('upload_floorplan')}</label>
                                <p className="text-xs text-slate-500">{t('upload_desc')}</p>
                                <input type="file" accept="image/*" multiple className="hidden" ref={imageInputRef}
                                       onChange={e => {
                                           if (e.target.files && e.target.files.length > 0) {
                                               setImageFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
                                           }
                                       }}
                                />
                                <div
                                    onClick={() => imageInputRef.current?.click()}
                                    onMouseEnter={() => setIsHoveringUpload(true)}
                                    onMouseLeave={() => setIsHoveringUpload(false)}
                                    className={`w-full p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group
                    ${isHoveringUpload ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'}`}
                                >
                                    {imageFiles.length > 0 ? (
                                        <>
                                            <div className="p-3 rounded-full mb-2 bg-green-100 text-green-600">
                                                <UploadCloud className="w-5 h-5"/>
                                            </div>
                                            <span
                                                className="text-sm font-medium text-green-700">{imageFiles.length} image(s) selected</span>
                                            <span className="text-[11px] text-red-500 mt-1 font-bold"
                                                  onClick={e => {
                                                      e.stopPropagation();
                                                      setImageFiles([]);
                                                  }}>Remove All</span>
                                        </>
                                    ) : (
                                        <>
                                            <div
                                                className={`p-3 rounded-full mb-2 transition-colors ${isHoveringUpload ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                <UploadCloud className="w-5 h-5"/>
                                            </div>
                                            <span
                                                className={`text-sm font-medium transition-colors ${isHoveringUpload ? 'text-blue-700' : 'text-slate-600'}`}>
                        Tap to select files
                      </span>
                                            <span
                                                className="text-[11px] text-slate-400 mt-1">JPEG, PNG up to 10MB</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStart}
                            disabled={isProcessing}
                            className="group relative w-full flex items-center justify-center gap-2 py-4 px-6 bg-slate-900 text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {!isProcessing && (
                                <div
                                    className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent"/>
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
                    </>
                ) : (
                    <>
                        {/* ── PROPERTY INFO CARD (OFFLINE) ─────────────────────────────────────────── */}
                        <div
                            className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-5 space-y-5 border border-slate-100">

                            {/* Video File Picker */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <UploadCloud className="w-4 h-4 text-blue-500"/>
                                    {language === 'zh' ? '选择巡检视频（带人声讲解）' : 'Select Walkthrough Video'}
                                </label>
                                <p className="text-xs text-slate-500">
                                    {language === 'zh' ? '上传在离线环境下拍摄好的现场巡检及解说视频' : 'Select a recorded inspection video file from your library'}
                                </p>
                                <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    ref={videoInputRef}
                                    onChange={e => {
                                        if (e.target.files?.[0]) setOfflineVideoFile(e.target.files[0]);
                                    }}
                                />

                                {offlineVideoFile ? (
                                    <div
                                        className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                            <File className="w-5 h-5"/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-blue-800 truncate">{offlineVideoFile.name}</p>
                                            <p className="text-xs text-blue-600">{(offlineVideoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setOfflineVideoFile(null)}
                                            className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-500 rounded-full flex items-center justify-center shrink-0 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5"/>
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => videoInputRef.current?.click()}
                                        className="p-8 border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                                    >
                                        <UploadCloud
                                            className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mb-2 transition-colors"/>
                                        <span
                                            className="text-sm font-bold text-slate-700 group-hover:text-blue-600">{language === 'zh' ? '选择现场录像视频' : 'Select Local Video'}</span>
                                        <span className="text-xs text-slate-400 mt-1">MP4, WebM, MOV up to 500MB</span>
                                    </div>
                                )}
                            </div>

                            {/* Address Input (Shared) */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500"/>
                                    {t('address_label')}
                                </label>
                                <Autocomplete
                                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                    onPlaceSelected={(place) => {
                                        if (place.formatted_address) setAddress(place.formatted_address);
                                        else if (place.name) setAddress(place.name);
                                    }}
                                    options={{types: [], componentRestrictions: {country: ['ie', 'gb']}}}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                                    placeholder={t('address_placeholder')}
                                    defaultValue={address}
                                    onChange={(e: any) => setAddress(e.target.value)}
                                />
                            </div>

                            {/* Property Cover Photo (Optional, shared) */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-blue-500"/>
                                    {language === 'zh' ? '住宅封面照片 (可选)' : 'Property Cover Photo (Optional)'}
                                </label>

                                {coverPhotoDataUrl ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                                        <img src={coverPhotoDataUrl} alt="Property exterior"
                                             className="w-full h-40 object-cover"/>
                                        <div
                                            className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent"/>
                                        <div className="absolute bottom-2 right-2 flex gap-2">
                                            <button
                                                onClick={openCamera}
                                                className="px-3 py-1.5 bg-white/90 backdrop-blur text-slate-700 text-xs font-semibold rounded-xl hover:bg-white transition-colors shadow"
                                            >
                                                {language === 'zh' ? '重拍' : 'Retake'}
                                            </button>
                                            <button
                                                onClick={removeCoverPhoto}
                                                className="px-3 py-1.5 bg-red-500/90 backdrop-blur text-white text-xs font-semibold rounded-xl hover:bg-red-500 transition-colors shadow"
                                            >
                                                {language === 'zh' ? '删除' : 'Remove'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={openCamera}
                                            className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                        >
                                            <Camera
                                                className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors"/>
                                            <span
                                                className="text-xs text-slate-500 group-hover:text-blue-600 font-medium">
                        {language === 'zh' ? '拍照' : 'Take Photo'}
                      </span>
                                        </button>
                                        <button
                                            onClick={() => coverFileInputRef.current?.click()}
                                            className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                        >
                                            <UploadCloud
                                                className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors"/>
                                            <span
                                                className="text-xs text-slate-500 group-hover:text-blue-600 font-medium">
                        {language === 'zh' ? '从相册选择' : 'From Gallery'}
                      </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Error Message */}
                        {offlineError && (
                            <div
                                className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl text-center">
                                ⚠️ {offlineError}
                            </div>
                        )}

                        {/* Analyze & Sync Button */}
                        <button
                            onClick={handleOfflineUpload}
                            disabled={offlineStatusStep > 0}
                            className="group relative w-full flex items-center justify-center gap-2 py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <div
                                className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent"/>
                            <UploadCloud className="w-5 h-5 shrink-0"/>
                            <span>{language === 'zh' ? '上传并开始多模态分析' : 'Upload & Start Multimodal Analysis'}</span>
                        </button>
                    </>
                )}
            </div>

            {/* Offline Video Progress Overlay */}
            {offlineStatusStep > 0 && (
                <div
                    className="fixed inset-0 z-200 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-white">
                    <div
                        className="bg-slate-800/80 border border-slate-700/50 rounded-3xl p-8 max-w-sm w-full space-y-6 flex flex-col items-center shadow-2xl animate-in fade-in zoom-in duration-200">
                        {/* Circular Progress Ring */}
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="40" className="stroke-slate-700" strokeWidth="6"
                                        fill="transparent"/>
                                <circle cx="48" cy="48" r="40"
                                        className="stroke-blue-500 transition-all duration-300 ease-out" strokeWidth="6"
                                        fill="transparent"
                                        strokeDasharray={251.2}
                                        strokeDashoffset={251.2 - (251.2 * offlineProgress) / 100}
                                        strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-lg font-extrabold">{offlineProgress}%</span>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-base font-bold tracking-tight">
                                {offlineStatusStep === 1 && (language === 'zh' ? '正在上传现场录像视频...' : 'Uploading walkthrough video...')}
                                {offlineStatusStep === 2 && (language === 'zh' ? 'Gemini 3.5 Flash 正在分析音视频...' : 'Gemini 3.5 Flash analyzing...')}
                                {offlineStatusStep === 3 && (language === 'zh' ? '正在整理数据并同步大屏...' : 'Saving structured dashboard report...')}
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed px-4">
                                {offlineStatusStep === 1 && (language === 'zh' ? '视频正在以切片形式高速传输给 Google AI' : 'Transferring file to Google GenAI storage')}
                                {offlineStatusStep === 2 && (language === 'zh' ? 'AI 正在听取您的解说音频，并融合画面细节' : 'Listening to speech narration & checking visual items')}
                                {offlineStatusStep === 3 && (language === 'zh' ? '正在创建房间检查条目，完成后大屏即刻更新' : 'Saving records and meta into dashboard directory')}
                            </p>
                        </div>

                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="bg-linear-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
                                style={{width: `${offlineProgress}%`}}/>
                        </div>
                    </div>
                </div>
            )}

            {/* Offline Analysis Success Modal */}
            {analysisFinished && (
                <div
                    className="fixed inset-0 z-200 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6">
                    <div
                        className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-6 flex flex-col items-center animate-in fade-in zoom-in duration-200 text-slate-900">
                        <div
                            className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-md">
                            <Check className="w-8 h-8 animate-[scaleIn_0.3s_ease-out]" strokeWidth={3}/>
                        </div>
                        <div className="space-y-2 text-center">
                            <h3 className="text-2xl font-black tracking-tight text-slate-900">
                                {language === 'zh' ? '分析并同步成功！' : 'Analysis Successful!'}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed px-2">
                                {language === 'zh'
                                    ? `最新代 Gemini 3.5 Flash 成功分析视频并自动抽取了 ${offlineRecordCount} 条巡检记录，已实时同步至 PC 仪表盘！`
                                    : `Gemini 3.5 Flash successfully parsed the video and extracted ${offlineRecordCount} items. Report synced.`}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => {
                                    setAnalysisFinished(false);
                                    setOfflineVideoFile(null);
                                }}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                {language === 'zh' ? '好的，开始下一场' : 'Great, inspect next'}
                            </button>
                            <a
                                href="http://localhost:3000"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-center block text-sm active:scale-95"
                            >
                                🖥️ {language === 'zh' ? '前往 PC 大屏端查看' : 'Go to Dashboard'}
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Offline Background Analysis Triggered Modal */}
            {showBackgroundModal && (
                <div
                    className="fixed inset-0 z-200 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div
                        className="bg-linear-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-6 flex flex-col items-center animate-in fade-in zoom-in duration-200 text-white text-center">
                        <div
                            className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center shadow-lg border border-blue-500/30 animate-pulse">
                            <UploadCloud className="w-8 h-8" strokeWidth={2.5}/>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tight text-white">
                                {language === 'zh' ? '视频上传成功！' : 'Upload Successful!'}
                            </h3>
                            <p className="text-sm text-slate-300 leading-relaxed px-1">
                                {language === 'zh'
                                    ? '视频已成功接收！AI 正在后台自动执行音视频深度分析与整理。您现在可以放心关闭或退出当前页面。'
                                    : 'Video received! The AI is analyzing the walkthrough in the background. You can safely close or exit this page now.'}
                            </p>
                            <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-2xl border border-slate-800 mt-2">
                                {language === 'zh'
                                    ? '⏳ 耗时约 1-2 分钟，分析完成后报告将自动同步显示在 PC 巡检大屏上。'
                                    : '⏳ Takes about 1-2 mins. The completed report will automatically show on the PC Dashboard.'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => {
                                    setShowBackgroundModal(false);
                                    setOfflineVideoFile(null);
                                    setAddress('');
                                }}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/20 active:scale-95 text-sm"
                            >
                                {language === 'zh' ? '我知道了 (安全退出)' : 'Got it (Safe to Exit)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
