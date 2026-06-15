"use client";

import {useRef, useState, useEffect} from "react";
import {useParams, useRouter} from "next/navigation";
import Link from "next/link";
import SignaturePad from "@/components/common/SignaturePad";
import {generateInspectionReport, InspectorProfile} from "@/lib/generateReport";
import {
    FileSignature, ChevronLeft, Share2, Layers,
    Check, Edit2, Play, MapPin
} from 'lucide-react';
import {apiGet} from "@/lib/api";

interface DefectRecord {
    id: string;
    room_name: string;
    item_name: string;
    description?: string;
    condition: string;
    severity?: string;
    elapsedSeconds?: number;
    photoBase64?: string;
    isManualFlag?: boolean;
}

interface RoomSegment {
    name: string;
    start: number;
    end: number;
    color: string;
    goodCount: number;
    fairCount: number;
    poorCount: number;
}

const ROOM_COLORS: Record<string, string> = {
    "kitchen/living": "#ec4899",
    "kitchen": "#db2777",
    "hallway": "#10b981",
    "hall": "#059669",
    "bathroom 1": "#f59e0b",
    "bathroom 2": "#d97706",
    "bedroom 1": "#8b5cf6",
    "bedroom 2": "#6366f1",
    "bedroom 3": "#4f46e5",
    "bedroom 4": "#a855f7",
    "bedroom 5": "#3b82f6",
    "outdoor": "#06b6d4",
    "exterior": "#0891b2"
};

const DEFAULT_COLORS = ["#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#6366f1", "#06b6d4"];

// Helper to convert an image URL to a clean base64 string for PDF insertion
async function imageUrlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1] || base64String;
            resolve(base64Data);
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

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [records, setRecords] = useState<DefectRecord[]>([]);
    const [segments, setSegments] = useState<RoomSegment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI States
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditingTimeline, setIsEditingTimeline] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
    const [isSigned, setIsSigned] = useState(false);

    const [meta, setMeta] = useState<{
        address: string;
        inspectorName: string;
        companyName?: string;
        phone?: string;
        email?: string;
        reference?: string;
        coverPhoto?: string;
        coverPhotoBase64?: string;
    } | null>(null);

    const [property, setProperty] = useState<any>({});
    const [inspection, setInspection] = useState<any>({});

    const fetchInspection = async () => {
        try {
            const response = await apiGet(`/inspection/inspections/${id}`);
            setRecords(response.data.records||[]);
            setVideoUrl(response.data.video_src);
            setProperty({...response.data.property});
            setInspection(response.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch report data
    useEffect(() => {
        if (!id) return;

        fetchInspection();
    }, [id]);

    // Video duration load & progress tick
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleDuration = () => setVideoDuration(video.duration || 0);
        const handleTimeUpdate = () => {
            const cur = video.currentTime || 0;
            setCurrentTime(cur);

            // Find active room segment based on play position
            const activeIdx = segments.findIndex(seg => cur >= seg.start && cur <= seg.end);
            if (activeIdx !== -1) {
                setActiveSegmentIndex(activeIdx);
            }
        };

        video.addEventListener("loadedmetadata", handleDuration);
        video.addEventListener("timeupdate", handleTimeUpdate);
        return () => {
            video.removeEventListener("loadedmetadata", handleDuration);
            video.removeEventListener("timeupdate", handleTimeUpdate);
        };
    }, [videoUrl, segments]);

    // Calculate Color Segments dynamically from parsed records
    useEffect(() => {
        if (records.length === 0) return;
        // Group records by room
        const roomMap: Record<string, { start: number; end: number; good: number; fair: number; poor: number }> = {};

        records.forEach((rec) => {
            const room = rec.room_name || "General";
            const seconds = rec.elapsedSeconds || 0;
            const cond = (rec.condition || "").toLowerCase();

            let rate: "good" | "fair" | "poor" = "good";
            // Support all 5 Condition Rating Glossary levels
            if (cond.includes("new")) rate = "good";
            else if (cond.includes("good")) rate = "good";
            else if (cond.includes("fair")) rate = "fair";
            else if (cond.includes("very poor")) rate = "poor";
            else if (cond.includes("poor")) rate = "poor";
            else rate = "fair"; // fallback for any unexpected values

            if (!roomMap[room]) {
                roomMap[room] = {start: seconds, end: seconds + 5, good: 0, fair: 0, poor: 0};
            }

            roomMap[room].start = Math.min(roomMap[room].start, seconds);
            roomMap[room].end = Math.max(roomMap[room].end, seconds + 5); // buffer of 5s minimum
            roomMap[room][rate]++;
        });

        // Convert map to sorted segments
        const calculatedSegments: RoomSegment[] = Object.keys(roomMap).map((name, idx) => {
            const normName = name.toLowerCase().trim();
            const color = ROOM_COLORS[normName] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            return {
                name,
                start: roomMap[name].start,
                end: roomMap[name].end,
                color,
                goodCount: roomMap[name].good,
                fairCount: roomMap[name].fair,
                poorCount: roomMap[name].poor
            };
        }).sort((a, b) => a.start - b.start);

        // Enforce overlapping bounds clean-up
        for (let i = 0; i < calculatedSegments.length - 1; i++) {
            calculatedSegments[i].end = calculatedSegments[i + 1].start;
        }

        if (calculatedSegments.length > 0 && videoDuration > 0) {
            calculatedSegments[calculatedSegments.length - 1].end = videoDuration;
        }

        setSegments(calculatedSegments);
    }, [records, videoDuration]);

    // Seek video timeline
    const handleSeekSegment = (start: number, idx: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = start;
            videoRef.current.play().catch(() => {
            });
            setActiveSegmentIndex(idx);
        }
    };

    // Adjust room duration manually (Edit timeline helper)
    const handleAdjustSegmentTime = (idx: number, field: "start" | "end", valStr: string) => {
        const val = parseFloat(valStr);
        if (isNaN(val)) return;

        setSegments(prev => {
            const next = [...prev];
            next[idx][field] = val;
            // Force constraints on neighbours
            if (field === "end" && next[idx + 1]) {
                next[idx + 1].start = val;
            } else if (field === "start" && next[idx - 1]) {
                next[idx - 1].end = val;
            }
            return next;
        });
    };

    // Trigger Toast
    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
        }, 2500);
    };

    // Share as link (copies current public path)
    const handleShare = () => {
        const shareUrl = `${window.location.origin}/shared/${id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            triggerToast("Share link copied to clipboard");
        }).catch(() => {
            alert("Failed to copy link");
        });
    };

    const handleSignatureSaved = async (sigBase64: string) => {
        setShowSignaturePad(false);
        setSignatureBase64(sigBase64);
        setIsSigned(true);

        try {
            // Mark signed on server and upload signature base64
            await fetch(`/api/reports/${id}/sign`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({signature: sigBase64})
            });
            triggerToast("Report signed successfully! (签字已确认)");
        } catch (err) {
            alert('Failed to save signature.');
        }
    };

    const handleGeneratePDF = async () => {
        setIsGenerating(true);

        const mockProfile: InspectorProfile = {
            companyName: meta?.companyName || 'Real Estate Agency',
            inspectorName: meta?.inspectorName || 'AI Inspector Assistant',
            phone: meta?.phone || '',
            email: meta?.email || '',
            reference: meta?.reference || id,
        };

        const now = new Date();
        const day = now.getDate();
        const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
        const monthName = now.toLocaleString('en-GB', {month: 'long'});
        const dateStr = `${monthName} ${day}${suffix} ${now.getFullYear()}`;

        try {
            // Load cover photo as Base64 dynamically if it is reference-based and not raw Base64
            let finalPhotoBase64 = meta?.coverPhotoBase64 || undefined;
            if (!finalPhotoBase64 && meta?.coverPhoto) {
                try {
                    const src = meta.coverPhoto.startsWith('http') || meta.coverPhoto.startsWith('/')
                        ? meta.coverPhoto
                        : `/uploads/${meta.coverPhoto}`;
                    finalPhotoBase64 = await imageUrlToBase64(src);
                } catch (photoErr) {
                    console.error("Failed to load and convert cover photo to base64:", photoErr);
                }
            }

            generateInspectionReport({
                address: meta?.address || 'Interactive Video Report',
                date: dateStr,
                records: records,
                inspector: mockProfile,
                coverPhotoBase64: finalPhotoBase64,
                tenantSignatureBase64: signatureBase64 || undefined,
            });

            triggerToast("PDF Report generated successfully! (PDF 已成功下载)");
        } catch (err) {
            alert('Failed to generate report.');
        } finally {
            setIsGenerating(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="dashboard-layout" style={{justifyContent: "center", alignItems: "center"}}>
                <h2 style={{color: "var(--text-muted)"}}>Loading Video Report...</h2>
            </div>
        );
    }

    // if (error || !videoUrl || records.length === 0) {
    //     return (
    //         <div className="dashboard-layout"
    //              style={{justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "20px"}}>
    //             <div className="glass-panel"
    //                  style={{padding: "50px", textAlign: "center", border: "1px solid var(--danger)"}}>
    //                 <h1 style={{fontSize: "2rem", marginBottom: "10px", color: "var(--danger)"}}>❌ Report Not Found</h1>
    //                 <p style={{color: "var(--text-muted)"}}>{error || "The requested inspection report does not exist."}</p>
    //                 <Link href="/" className="sheet-select"
    //                       style={{display: "inline-block", marginTop: "20px", textDecoration: "none"}}>Go back
    //                     home</Link>
    //             </div>
    //         </div>
    //     );
    // }

    return (
        <>
            {/* ── MAIN REPORT CONTENT ────────────────────────────────────────────── */}
            <div className="main-viewport" style={{flexDirection: "row"}}>

                {/* Left Half: Continuous Video Timeline Player */}
                <section style={{
                    flex: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    padding: "24px",
                    overflowY: "auto",
                    borderRight: "1px solid var(--panel-border)"
                }}>
                    {/* Back & Share Header */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "20px"
                    }}>
                        <Link href="/" style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--foreground)",
                            textDecoration: "none",
                            fontWeight: "bold",
                            fontSize: "0.9rem"
                        }}>
                            <ChevronLeft size={20}/>
                            Back to Dashboard
                        </Link>
                        <div style={{display: "flex", gap: "10px"}}>
                            <button
                                onClick={handleShare}
                                className="glass-panel flex items-center gap-2 px-4 py-2.5 text-foreground cursor-pointer font-bold text-sm"
                            >
                                <Share2 size={16}/>
                                Share as link
                            </button>
                        </div>
                    </div>

                    {/* Property Address */}
                    <div style={{marginBottom: "16px"}}>
                        <h2 style={{
                            fontSize: "1.35rem",
                            fontWeight: "900",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--foreground)",
                            letterSpacing: "-0.3px"
                        }}>
                            <MapPin size={20} style={{color: "var(--primary)"}}/>
                            {meta?.address || "Walkthrough Inspection Report"}
                        </h2>
                    </div>

                    {/* Continuous Walkthrough Video Player */}
                    <div className="glass-panel" style={{
                        overflow: "hidden",
                        position: "relative",
                        background: "black",
                        borderRadius: "16px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                    }}>
                        <video
                            ref={videoRef}
                            style={{width: "100%", maxHeight: "420px", display: "block"}}
                            controls
                            preload="auto"
                            src={videoUrl as string}
                        />
                    </div>

                    {/* Multi-Colored Horizontal Segmented Timeline Track */}
                    <div className="timeline-track-container">
                        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                              <span style={{
                                  fontSize: "0.8rem",
                                  fontWeight: "bold",
                                  color: "var(--text-muted)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px"
                              }}>
                                <Layers size={14}/> Walkthrough Room Segments Timeline
                              </span>
                            <button
                                onClick={() => setIsEditingTimeline(!isEditingTimeline)}
                                className="glass-panel"
                                style={{
                                    padding: "4px 10px", fontSize: "0.75rem", fontWeight: "bold",
                                    color: isEditingTimeline ? "var(--primary)" : "var(--text-muted)", cursor: "pointer"
                                }}
                            >
                                <Edit2 size={12} style={{marginRight: "4px", display: "inline"}}/>
                                {isEditingTimeline ? "Done Adjusting" : "Edit timeline"}
                            </button>
                        </div>

                        {/* Segment Track Bar */}
                        <div className="timeline-track">
                            {segments.map((seg, idx) => {
                                const total = videoDuration || 1;
                                const widthPercent = ((seg.end - seg.start) / total) * 100;
                                return (
                                    <div
                                        key={idx}
                                        className={`timeline-segment ${activeSegmentIndex === idx ? "active" : ""}`}
                                        style={{
                                            width: `${widthPercent}%`,
                                            backgroundColor: seg.color
                                        }}
                                        onClick={() => handleSeekSegment(seg.start, idx)}
                                        title={`${seg.name} (${formatTime(seg.start)} - ${formatTime(seg.end)})`}
                                    >
                                        {widthPercent > 6 && seg.name}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Time Adjustments Form (When editing timeline) */}
                        {isEditingTimeline && (
                            <div className="glass-panel" style={{
                                padding: "16px",
                                marginTop: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px"
                            }}>
                                <h4 style={{fontSize: "0.8rem", fontWeight: "bold"}}>Adjust Room Segments Transitions
                                    (Seconds)</h4>
                                <div style={{display: "flex", flexWrap: "wrap", gap: "12px"}}>
                                    {segments.map((seg, idx) => (
                                        <div key={idx} style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            fontSize: "0.85rem"
                                        }}>
                                            <span style={{fontWeight: "bold", color: seg.color}}>{seg.name}:</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={seg.start.toFixed(1)}
                                                onChange={(e) => handleAdjustSegmentTime(idx, "start", e.target.value)}
                                                className="sheet-input"
                                                style={{width: "64px", padding: "4px 8px"}}
                                            />
                                            <span>to</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={seg.end.toFixed(1)}
                                                onChange={(e) => handleAdjustSegmentTime(idx, "end", e.target.value)}
                                                className="sheet-input"
                                                style={{width: "64px", padding: "4px 8px"}}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Half: Room grid cards indicator list */}
                <section style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    padding: "24px",
                    overflowY: "auto",
                    background: "rgba(10, 15, 26, 0.15)"
                }}>
                    <div style={{marginBottom: "20px"}}>
                        <h2 style={{fontSize: "1.25rem", fontWeight: "900", letterSpacing: "-0.4px"}}>Property Room
                            Inspection</h2>
                        <p style={{fontSize: "0.8rem", color: "var(--text-muted)"}}>Click on any room to verify full
                            defect listings and edit element details.</p>
                    </div>

                    {/* Rooms Card Grid */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        flex: 1,
                        alignContent: "flex-start",
                        paddingBottom: "20px"
                    }}>
                        {segments.map((seg, idx) => (
                            <div
                                key={idx}
                                onClick={() => router.push(`/report/${id}/room/${encodeURIComponent(seg.name)}`)}
                                className="glass-panel glass-panel-hover"
                                style={{
                                    padding: "16px",
                                    cursor: "pointer",
                                    borderLeft: `4px solid ${seg.color}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    height: "136px"
                                }}
                            >
                                <div>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start"
                                    }}>
                                        <h3 style={{margin: 0, fontSize: "0.95rem", fontWeight: "bold"}}>{seg.name}</h3>
                                        <span className="badge badge-success"
                                              style={{fontSize: "0.6rem"}}>Completed</span>
                                    </div>
                                    <p style={{
                                        margin: 0,
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "4px"
                                    }}>
                                        Chapter: {formatTime(seg.start)} - {formatTime(seg.end)}
                                    </p>
                                </div>

                                <div className="room-badge-row" style={{marginTop: "12px"}}>
                                    {seg.poorCount > 0 && (
                                        <span className="room-badge room-badge-poor">{seg.poorCount} Poor</span>
                                    )}
                                    {seg.fairCount > 0 && (
                                        <span className="room-badge room-badge-fair">{seg.fairCount} Fair</span>
                                    )}
                                    {seg.goodCount > 0 && (
                                        <span className="room-badge room-badge-good">{seg.goodCount} Good</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Action Footer for Signatures */}
                    <div style={{
                        borderTop: "1px solid var(--panel-border)",
                        paddingTop: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px"
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.85rem",
                            color: "var(--text-muted)"
                        }}>
                            <span>Defects severity matches HMO code</span>
                            {meta?.inspectorName && <span style={{fontWeight: "bold"}}>Inspector: {meta.inspectorName}</span>}
                        </div>

                        <div style={{display: "flex", gap: "12px", width: "100%"}}>
                            <button
                                onClick={() => {
                                    if (!isSigned) setShowSignaturePad(true);
                                }}
                                disabled={isGenerating}
                                style={{
                                    flex: 1,
                                    padding: "14px",
                                    backgroundColor: isSigned ? "rgba(16, 185, 129, 0.12)" : "var(--panel-bg)",
                                    color: isSigned ? "#10b981" : "var(--foreground)",
                                    border: isSigned ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--panel-border)",
                                    borderRadius: "12px",
                                    fontSize: "0.95rem",
                                    fontWeight: "bold",
                                    cursor: isSigned ? "default" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    transition: "var(--transition)",
                                }}
                            >
                                {isSigned ? (
                                    <>
                                        <Check size={16}/>
                                        Signed (已签署)
                                    </>
                                ) : (
                                    <>
                                        <FileSignature size={16}/>
                                        Sign Report (签字确认)
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleGeneratePDF}
                                disabled={isGenerating}
                                style={{
                                    flex: 1, padding: "14px", backgroundColor: "var(--accent)", color: "white",
                                    border: "none", borderRadius: "12px", fontSize: "0.95rem", fontWeight: "bold",
                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                    gap: "8px", transition: "var(--transition)",
                                    boxShadow: "0 6px 20px rgba(99, 102, 241, 0.2)"
                                }}
                            >
                                {isGenerating ? (
                                    <span>Generating PDF...</span>
                                ) : (
                                    <>
                                        <Play size={14} style={{fill: "white"}}/>
                                        Generate PDF (生成 PDF)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </section>

            </div>

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
