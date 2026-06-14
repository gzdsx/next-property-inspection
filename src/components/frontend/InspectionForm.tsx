'use client';

import {useLocale, useTranslations} from "@/contexts/LocaleContext";
import {
    ArrowRight,
    Camera, Check,
    File,
    FileText,
    HomeIcon,
    Loader2,
    LogOut,
    MapPin,
    UploadCloud,
    User,
    X
} from "lucide-react";
import {signOut, useSession} from "next-auth/react";
import {useEffect, useMemo, useRef, useState} from "react";
import {apiGet} from "@/lib/api";
import Autocomplete from "react-google-autocomplete";
import ModalCamera from "@/components/frontend/ModalCamera";
import {useNewReport} from "@/contexts/ReportContext";
import {useRouter} from "next/navigation";

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

const InspectionForm = () => {
    const {locale: language} = useLocale();
    const {data: session} = useSession();
    const {report, updateReport} = useNewReport();
    const {t} = useTranslations('inspection');
    const router = useRouter();
    const currentUser:any = session?.user || {};

    const safeReport = report || {};
    const [activeTab, setActiveTab] = useState('live');
    const [properties, setProperties] = useState<any[]>([]);
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | string>('');

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

    // 新增离线视频状态和 refs
    const [offlineVideoFile, setOfflineVideoFile] = useState<File | null>(null);
    const [offlineStatusStep, setOfflineStatusStep] = useState<number>(0); // 0=idle, 1=uploading, 2=analyzing, 3=finalizing
    const [offlineProgress, setOfflineProgress] = useState<number>(0);
    const [analysisFinished, setAnalysisFinished] = useState<boolean>(false);
    const [createdReportId, setCreatedReportId] = useState<string>('');
    const [offlineError, setOfflineError] = useState<string | null>(null);
    const [offlineRecordCount, setOfflineRecordCount] = useState<number>(0);
    const [showBackgroundModal, setShowBackgroundModal] = useState<boolean>(false);

    const currentProperty = useMemo(() => {
        return properties.find(p => p.id === report?.property_id);
    }, [properties, report?.property_id]);

    const fetchProperties = async () => {
        try {
            const response = await apiGet(`/inspection/properties`);
            setProperties([...response.data.items]);
        } catch (e) {

        } finally {

        }
    }

    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            updateReport({image: dataUrl});
        };
        reader.readAsDataURL(file);
    };

    // ── Offline Video Upload & Analysis ─────────────────────────────────────
    const handleOfflineUpload = async () => {
        if (!safeReport.videoFile) {
            alert(language === 'zh' ? '请先选择视频文件' : 'Please select a video file first');
            return;
        }

        // 保存地址用于PDF封面生成等
        setOfflineError(null);
        setOfflineStatusStep(1); // 1 = 正在上传
        setOfflineProgress(12);

        try {
            const formData = new FormData();
            formData.append('video', safeReport.videoFile);
            if (safeReport.address) formData.append('address', safeReport.address);
            if (safeReport.coverPhotoDataUrl) formData.append('coverPhoto', safeReport.coverPhotoDataUrl);

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

    const handleStart = async () => {
        try {
            setIsProcessing(true);
            const {property_id, address, video, notes, imageFiles} = safeReport;
            if (!property_id && !address && !notes && !imageFiles?.length) {
                router.push('/inspection/live');
                return false;
            }

            const formData = new FormData();
            if (property_id) formData.append('property_id', property_id);
            if (address) formData.append('address', address);
            if (notes) formData.append('notes', notes);
            if (pdfFile) formData.append('pdfFile', pdfFile);
            if (imageFiles) imageFiles.forEach((file: any) => formData.append('imageFiles', file));
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
        } catch (e) {

        } finally {
            setIsProcessing(false);
        }
    }

    useEffect(() => {
        fetchProperties();
    }, []);

    useEffect(() => {
        if (currentProperty) {
            if (!report.image) updateReport({image: currentProperty.image});
        }
    }, [currentProperty]);

    return (
        <>
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
                                    {currentUser.name || (language === 'zh' ? '加载中...' : 'Loading...')}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                    {currentUser.company_name || 'Irish PropTech Agency'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={async () => {
                                await signOut();
                                window.location.reload();
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
                            <span
                                className="text-xs text-slate-700 font-semibold">{currentUser.phone_number || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                            <span
                                className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">{language === 'zh' ? '邮箱' : 'Email'}</span>
                            <span
                                className="text-xs text-slate-700 font-semibold truncate block">{currentUser.email || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 col-span-2">
                            <span
                                className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">{language === 'zh' ? '参考编号' : 'Reference No.'}</span>
                            <span
                                className="text-xs text-slate-700 font-semibold">{currentUser.reference || 'N/A'}</span>
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
                                        updateReport({property_id: e.target.value});
                                    }}
                                >
                                    <option value="">
                                        {language === 'zh' ? '-- 仅手动录入 --' : '-- Manual Entry Only --'}
                                    </option>
                                    {[...properties].sort((a, b) => {
                                        if (!address) return 0;
                                        const scoreA = getAddressSimilarity(address, a.name);
                                        const scoreB = getAddressSimilarity(address, b.name);
                                        return scoreB - scoreA;
                                    }).map((prop) => (
                                        <option key={prop.id} value={prop.id}>
                                            {prop.name} ({prop.type || 'HMO'})
                                        </option>
                                    ))}
                                </select>

                                {report?.property_id && (
                                    <div
                                        className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-2 space-y-2 text-xs text-blue-700 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex justify-between items-center font-bold">
                                            <span>🔗 {language === 'zh' ? '已成功关联旧房源数据' : 'Successfully linked property records'}</span>
                                            <span className="font-mono">{report.property_id}</span>
                                        </div>
                                        {
                                            currentProperty && (
                                                <div className="grid grid-cols-2 gap-2 text-blue-600/80 pt-1">
                                                    <div>🏠 {currentProperty?.type}</div>
                                                    <div>📊 {currentProperty?.views || 0} {language === 'zh' ? '次历史巡检' : 'past visits'}</div>
                                                    <div>🛏️ {currentProperty?.bedrooms || 0} Bed ·
                                                        🛁 {currentProperty?.main_bathrooms || 0} Bath
                                                    </div>
                                                    <div>🍳 {currentProperty?.kitchen_type || 'Standard'}</div>
                                                </div>
                                            )
                                        }
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
                                {
                                    report?.image ? (
                                        <div
                                            className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm animate-in fade-in zoom-in duration-200">
                                            <img src={report.image} alt="Property exterior"
                                                 className="w-full h-44 object-cover"/>
                                            <div
                                                className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent"/>
                                            {/* Top-right floating close button */}
                                            <button
                                                onClick={() => {
                                                    updateReport({image: null});
                                                }}
                                                className="absolute top-3 right-3 w-8 h-8 bg-slate-900/60 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow"
                                                title={language === 'zh' ? '删除封面图' : 'Remove cover photo'}
                                            >
                                                <X className="w-4 h-4"/>
                                            </button>

                                            <div
                                                className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                                                <span
                                                    className="text-white text-xs font-semibold bg-blue-600/85 backdrop-blur px-2.5 py-1.5 rounded-xl"
                                                    onClick={(e) => {
                                                        e.nativeEvent.stopPropagation();
                                                        updateReport({image: currentProperty?.image});
                                                    }}
                                                >
                                                  🏠 {language === 'zh' ? '已导入房源封面' : 'Loaded Record Cover'}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.nativeEvent.stopPropagation();
                                                        coverFileInputRef.current?.click()
                                                    }}
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
                                }
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
                                    value={safeReport.notes}
                                    onChange={e => {
                                        updateReport({notes: e.target.value});
                                    }}
                                />

                                {/* PDF attachment — full-width tap target for mobile */}
                                <input
                                    type="file" accept="application/pdf" className="hidden" ref={pdfInputRef}
                                    onChange={e => {
                                        if (e.target.files?.[0]) {
                                            updateReport({pdfFile: e.target.files?.[0]});
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => pdfInputRef.current?.click()}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98]
                                         ${safeReport.pdfFile
                                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                                        : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                                >
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pdfFile ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
                                        <File
                                            className={`w-4 h-4 ${report?.pdfFile ? 'text-blue-600' : 'text-slate-400'}`}/>
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm font-semibold leading-tight">
                                            {report?.pdfFile
                                                ? (language === 'zh' ? '已附加PDF报告' : 'PDF Report Attached')
                                                : (language === 'zh' ? '附加旧巡检报告（PDF）' : 'Attach Previous Report (PDF)')}
                                        </p>
                                        <p className="text-xs mt-0.5 truncate opacity-70">
                                            {report?.pdfFile ? report?.pdfFile.name : (language === 'zh' ? '可选 · 帮助AI了解历史记录' : 'Optional · Helps AI understand history')}
                                        </p>
                                    </div>
                                    {report?.pdfFile && (
                                        <button
                                            type="button"
                                            onClick={e => {
                                                e.nativeEvent.stopPropagation();
                                                updateReport({pdfFile: null});
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
                                <label className="text-sm font-semibold text-slate-700">{t('upload_floorplan')}</label>
                                <p className="text-xs text-slate-500">{t('upload_desc')}</p>
                                <input type="file" accept="image/*" multiple className="hidden" ref={imageInputRef}
                                       onChange={e => {
                                           if (e.target.files && e.target.files.length > 0) {
                                               updateReport({
                                                   imageFiles: [...(safeReport.imageFiles || []), ...Array.from(e.target.files as FileList)]
                                               });
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
                                    {safeReport.imageFiles?.length > 0 ? (
                                        <>
                                            <div className="p-3 rounded-full mb-2 bg-green-100 text-green-600">
                                                <UploadCloud className="w-5 h-5"/>
                                            </div>
                                            <span
                                                className="text-sm font-medium text-green-700">{safeReport.imageFiles?.length || 0} image(s) selected</span>
                                            <span className="text-[11px] text-red-500 mt-1 font-bold"
                                                  onClick={e => {
                                                      e.stopPropagation();
                                                      updateReport({imageFiles: []});
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
                                        updateReport({videoFile: e.target.files?.[0]});
                                    }}
                                />

                                {safeReport.videoFile ? (
                                    <div
                                        className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                            <File className="w-5 h-5"/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-blue-800 truncate">{safeReport.videoFile.name}</p>
                                            <p className="text-xs text-blue-600">{(safeReport.videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateReport({videoFile: null});
                                            }}
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

                                {safeReport.coverPhotoDataUrl ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                                        <img src={safeReport.coverPhotoDataUrl} alt="Property exterior"
                                             className="w-full h-40 object-cover"/>
                                        <div
                                            className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent"/>
                                        <div className="absolute bottom-2 right-2 flex gap-2">
                                            <button
                                                onClick={() => setIsCameraOpen(true)}
                                                className="px-3 py-1.5 bg-white/90 backdrop-blur text-slate-700 text-xs font-semibold rounded-xl hover:bg-white transition-colors shadow"
                                            >
                                                {language === 'zh' ? '重拍' : 'Retake'}
                                            </button>
                                            <button
                                                onClick={() => updateReport({coverPhotoDataUrl: null})}
                                                className="px-3 py-1.5 bg-red-500/90 backdrop-blur text-white text-xs font-semibold rounded-xl hover:bg-red-500 transition-colors shadow"
                                            >
                                                {language === 'zh' ? '删除' : 'Remove'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsCameraOpen(true)}
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
            {
                isCameraOpen && (
                    <ModalCamera
                        onClose={() => setIsCameraOpen(false)}
                        onCapture={dataUrl => {
                            updateReport({coverPhotoDataUrl: dataUrl});
                        }}
                    />
                )
            }

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

            {analysisFinished && (
                <div className="fixed inset-0 z-200 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6">
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
        </>
    );
};

export default InspectionForm;