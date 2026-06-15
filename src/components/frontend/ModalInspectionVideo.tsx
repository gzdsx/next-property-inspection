'use client';

import {useRef, useState} from "react";
import {X} from "lucide-react";
import {toast} from "sonner";
import {useChunkUpload} from "@/hooks/useChunkUpload";
import {apiPost, apiPut} from "@/lib/api";

interface ModalInspectionVideoProps {
    isOpen: boolean;
    onClose: () => void;
    inspection: any;
}

const ModalInspectionVideo = ({inspection, isOpen, onClose}: ModalInspectionVideoProps) => {
    const [videoToAssociate, setVideoToAssociate] = useState("");
    const [mockDefectsCount, setMockDefectsCount] = useState(5);

    // Real AI Analysis Upload States
    const [associationMode, setAssociationMode] = useState<"real" | "demo">("real");
    const [realVideoFile, setRealVideoFile] = useState<File | null>(null);
    const [realUploadStep, setRealUploadStep] = useState(0); // 0=idle, 1=uploading, 2=analyzing, 3=finalizing
    const [realUploadError, setRealUploadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const realVideoInputRef = useRef<HTMLInputElement>(null);
    const {uploadFile, uploadProgress} = useChunkUpload();

    // Real upload video to draft and analyze via mobile API proxied transparently
    const handleRealUploadSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        if (!realVideoFile) return;
        setRealUploadError(null);
        setRealUploadStep(1); // Uploading

        try {
            setRealUploadStep(1);
            const video_src = await uploadFile(realVideoFile);
            setRealUploadStep(2);
            const formData = new FormData();
            formData.append('video_src', video_src);
            formData.append('video_type', realVideoFile.type);
            await apiPut(`/inspection/inspections/${inspection.id}`, formData);

            // Call the mobile app API proxied transparently via next.config rewrites!
            await apiPost('/gemini/inspections/analyze', {inspection_id: inspection.id});
            setRealUploadStep(3); // Analyzing with Gemini 3.5 Flash

            setTimeout(()=>{
                setRealUploadStep(0);
                onClose();
            },2000);
        } catch (err: any) {
            console.error(err);
            setRealUploadError(err.message || 'Error uploading video file. Please try again.');
            setRealUploadStep(0);
        }
    };

    if (!isOpen || !inspection) return null;
    return (
        <div className="modal-backdrop">
            <div className="glass-panel modal-card"
                 style={{maxWidth: "550px", position: "relative", overflow: "hidden"}}>

                {/* Real AI Upload Progress Overlay */}
                {realUploadStep > 0 && (
                    <div style={{
                        position: "absolute", inset: 0, zIndex: 90,
                        background: "rgba(14, 17, 26, 0.96)", backdropFilter: "blur(12px)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        padding: "32px", textAlign: "center", animation: "fadeIn 0.3s ease-out"
                    }}>
                        <div style={{
                            position: "relative",
                            width: "96px",
                            height: "96px",
                            marginBottom: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <svg style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                transform: "rotate(-90deg)"
                            }}>
                                <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="6"
                                        fill="transparent"/>
                                <circle cx="48" cy="48" r="40" stroke="var(--primary)" strokeWidth="6"
                                        fill="transparent"
                                        strokeDasharray={251.2}
                                        strokeDashoffset={251.2 - (251.2 * uploadProgress) / 100}
                                        style={{transition: "stroke-dashoffset 0.3s ease", strokeLinecap: "round"}}
                                />
                            </svg>
                            <span style={{
                                fontSize: "1.3rem",
                                fontWeight: "900",
                                color: "white"
                            }}>{uploadProgress}%</span>
                        </div>

                        <h4 style={{margin: "0 0 8px 0", fontSize: "1.1rem", fontWeight: "bold", color: "white"}}>
                            {realUploadStep === 1 && "Uploading video file to Gemini..."}
                            {realUploadStep === 2 && "Gemini 3.5 Flash sound & visual parsing..."}
                            {realUploadStep === 3 && "Updating property database and inspection..."}
                        </h4>

                        <p style={{
                            margin: 0,
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                            maxWidth: "360px",
                            lineHeight: "1.5"
                        }}>
                            {realUploadStep === 1 && "The video stream is being uploaded in chunks directly to Google GenAI server storage."}
                            {realUploadStep === 2 && "AI is analyzing the audio narration and mapping visual defect items in standard Irish room conventions."}
                            {realUploadStep === 3 && "Synthesizing final condition counts and writing structured report documents to portal uploads."}
                        </p>
                    </div>
                )}

                <div style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid var(--panel-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <h3 style={{margin: 0, fontSize: "1.2rem", fontWeight: "bold"}}>Associate Walkthrough Media</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer"
                        }}
                    >
                        <X size={20}/>
                    </button>
                </div>

                <div style={{padding: "24px", display: "flex", flexDirection: "column", gap: "16px"}}>
                    <form onSubmit={handleRealUploadSubmit}
                          style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                        <p style={{fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, lineHeight: "1.4"}}>
                            This is a <strong>{inspection.type}</strong> visit. Choose a recorded walkthrough video
                            file to analyze its real-world room assets and structural defects.
                        </p>

                        <input
                            type="file"
                            accept="video/*"
                            ref={realVideoInputRef}
                            style={{display: "none"}}
                            onChange={(e) => {
                                if (e.target.files?.[0]) setRealVideoFile(e.target.files[0]);
                            }}
                        />

                        {realVideoFile ? (
                            <div className="glass-panel" style={{
                                padding: "16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                border: "1px solid var(--panel-border)",
                                borderRadius: "12px"
                            }}>
                                <div style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--primary-bg)",
                                    color: "var(--primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0
                                }}>
                                    🎥
                                </div>
                                <div style={{flex: 1, minWidth: 0}}>
                                    <p style={{
                                        margin: 0,
                                        fontSize: "0.85rem",
                                        fontWeight: "bold",
                                        color: "var(--foreground)"
                                    }} className="truncate">{realVideoFile.name}</p>
                                    <p style={{
                                        margin: "2px 0 0 0",
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)"
                                    }}>{(realVideoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRealVideoFile(null)}
                                    style={{
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "50%",
                                        border: "none",
                                        backgroundColor: "rgba(255,255,255,0.05)",
                                        color: "var(--text-muted)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <X size={14}/>
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => realVideoInputRef.current?.click()}
                                style={{
                                    padding: "36px 16px",
                                    border: "2px dashed var(--panel-border)",
                                    borderRadius: "16px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    textAlign: "center",
                                    background: "rgba(255,255,255,0.01)"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--panel-border)"}
                            >
                                <span style={{fontSize: "2rem", marginBottom: "8px"}}>📁</span>
                                <span style={{fontSize: "0.85rem", fontWeight: "bold", color: "var(--foreground)"}}>Choose walkthrough video file</span>
                                <span style={{fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px"}}>MP4, WebM, MOV up to 500MB</span>
                            </div>
                        )}

                        {realUploadError && (
                            <div style={{
                                padding: "12px",
                                borderRadius: "10px",
                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                color: "#f87171",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                textAlign: "center"
                            }}>
                                ⚠️ {realUploadError}
                            </div>
                        )}

                        <div style={{
                            padding: "16px 0 0 0",
                            borderTop: "1px solid var(--panel-border)",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "12px"
                        }}>
                            <button type="button" onClick={onClose} className="sheet-select"
                                    style={{padding: "10px 20px"}}>Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!realVideoFile}
                                style={{
                                    padding: "0 20px",
                                    backgroundColor: realVideoFile ? "var(--primary)" : "rgba(255,255,255,0.05)",
                                    border: "none",
                                    borderRadius: "8px",
                                    color: realVideoFile ? "white" : "var(--text-muted)",
                                    fontWeight: "bold",
                                    height: "38px",
                                    cursor: realVideoFile ? "pointer" : "not-allowed",
                                    transition: "all 0.2s"
                                }}
                            >
                                Analyze Walkthrough Video
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ModalInspectionVideo;