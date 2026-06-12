'use client';

import {useState, useRef, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {
    UploadCloud, Home as HomeIcon,
    Check, X
} from 'lucide-react';
import type {InspectorProfile} from '@/lib/generateReport';
import LangSwitchButton from "@/components/frontend/LangSwitchButton";
import {useLocale, useTranslations} from "@/contexts/LocaleContext";
import InspectionForm from "@/components/frontend/InspectionForm";

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
    const {locale: language, setLocale: setLanguage} = useLocale();
    const {t} = useTranslations('inspection');
    const router = useRouter();

    const [coverPhotoDataUrl, setCoverPhotoDataUrl] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);

    const [isHoveringUpload, setIsHoveringUpload] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [offlineStatusStep, setOfflineStatusStep] = useState<number>(0);
    const [analysisFinished, setAnalysisFinished] = useState<boolean>(false);
    const [createdReportId, setCreatedReportId] = useState<string>('');
    const [offlineError, setOfflineError] = useState<string | null>(null);
    const [offlineRecordCount, setOfflineRecordCount] = useState<number>(0);
    const [showBackgroundModal, setShowBackgroundModal] = useState<boolean>(false);
    const [offlineProgress, setOfflineProgress] = useState(0);

    useEffect(() => {
        // Check for unfinished session
        const hasKb = localStorage.getItem('pre_inspection_kb');
        const hasRecords = localStorage.getItem('inspection_records');
        if (hasKb || (hasRecords && hasRecords !== '[]')) {
            setShowResumeModal(true);
        }
    }, []);

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
            <InspectionForm/>

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
