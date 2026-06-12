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
                        <a href={'/'}><HomeIcon className="w-5 h-5 text-white" strokeWidth={2.5}/></a>
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


            {/* Offline Analysis Success Modal */}


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
