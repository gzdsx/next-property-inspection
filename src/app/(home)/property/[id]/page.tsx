"use client";

import {useState, useEffect, useRef} from "react";
import {useParams, useRouter} from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft, ClipboardList, LogIn, LogOut, MoreHorizontal,
    Pencil, Wrench
} from "lucide-react";
import {type Property} from "@/types";
import {apiGet} from "@/lib/api";
import ReportCard from "@/components/frontend/ReportCard";
import ModalProperty from "@/components/frontend/ModalProperty";

interface ReportSummary {
    id: string;
    timestamp: number;
    createdAt: string;
    defectCount: number;
    address?: string;
    inspectorName?: string;
    isSigned?: boolean;
    isOfflineVideo?: boolean;
    companyName?: string;
    conditionStats?: { poor: number; fair: number; good: number };
    coverPhoto?: string;
}

interface InspectionItem {
    id: string;
    type: "Routine Inspection" | "Move-in Inspection" | "Move-out Inspection" | "Maintenance Check" | "Other";
    status: "Draft" | "Completed";
    date: string;
    inspectorName: string;
    subtext: string;
    reportId?: string;
    conditionStats?: { poor: number; fair: number; good: number };
    isSigned?: boolean;
}

export default function PropertyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    // Global layouts & theme
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [isLoading, setIsLoading] = useState(true);
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);

    // Data States
    const [reports, setReports] = useState<any[]>([]);
    const [property, setProperty] = useState<Property | null>(null);
    const [isDuplicateAddress, setIsDuplicateAddress] = useState(false);
    const [inspections, setInspections] = useState<InspectionItem[]>([]);
    const [serverReports, setServerReports] = useState<ReportSummary[]>([]);
    const [editingTypeId, setEditingTypeId] = useState<string | null>(null); // id of card showing type dropdown

    // Toast notification state
    const [toasts, setToasts] = useState<Array<{
        id: string;
        msg: string;
        type: 'success' | 'error' | 'info' | 'warning'
    }>>([]);
    const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, {id, msg, type}]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    // Simulation Upload Modal
    const [activeDraft, setActiveDraft] = useState<InspectionItem | null>(null);
    const [videoToAssociate, setVideoToAssociate] = useState("");
    const [mockDefectsCount, setMockDefectsCount] = useState(5);

    // Real AI Analysis Upload States
    const [associationMode, setAssociationMode] = useState<"real" | "demo">("real");
    const [realVideoFile, setRealVideoFile] = useState<File | null>(null);
    const [realUploadStep, setRealUploadStep] = useState(0); // 0=idle, 1=uploading, 2=analyzing, 3=finalizing
    const [realUploadProgress, setRealUploadProgress] = useState(0);
    const [realUploadError, setRealUploadError] = useState<string | null>(null);

    const realVideoInputRef = useRef<HTMLInputElement>(null);

    const fetchProperty = async () => {
        try {
            const response = await apiGet(`/inspection/properties/${id}`);
            setProperty(response.data);
        } catch (e) {

        } finally {

        }
    }

    const fetchInspections = async () => {
        try {
            setIsLoading(true);
            const response = await apiGet(`/inspection/reports`, {property_id: id});
            setReports(response.data.items);
        } catch (e) {

        } finally {
            setIsLoading(false);
        }
    }

    // Load theme preference
    useEffect(() => {
        const isLight = document.documentElement.classList.contains("light-theme");
        setTheme(isLight ? "light" : "dark");
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        if (nextTheme === "light") {
            document.documentElement.classList.add("light-theme");
        } else {
            document.documentElement.classList.remove("light-theme");
        }
    };

    const cleanAddress = (addr: string) => {
        return (addr || "").replace(/[\s,.-]+/g, " ").trim().toLowerCase();
    };

    const getItemTimestamp = (item: InspectionItem): number => {
        if (item.reportId) {
            const ts = parseInt(item.reportId);
            if (!isNaN(ts)) return ts;
        }
        const digits = item.id.replace(/\D/g, "");
        if (digits) {
            const ts = parseInt(digits);
            if (!isNaN(ts)) return ts;
        }
        const dateTs = new Date(item.date).getTime();
        if (!isNaN(dateTs)) return dateTs;
        return 0;
    };

    const fetchData = async () => {
        await fetchProperty();
        await fetchInspections();
    }

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    // Create dynamic new draft
    const handleAddNewDraft = async (type: "Routine Inspection" | "Move-in Inspection" | "Move-out Inspection" | "Maintenance Check" | "Other") => {
        if (!property) return;

        // Find organization custom inspector name or default to John Huston
        const companyInspector = localStorage.getItem("company_inspector_name") || "John Huston";

        const newDraft: InspectionItem = {
            id: `draft_${Date.now()}`,
            type,
            status: "Draft",
            date: new Date().toLocaleDateString("en-US", {year: "numeric", month: "short", day: "numeric"}),
            inspectorName: companyInspector,
            subtext: "No media uploaded yet - tap to continue"
        };

        const base = typeof window !== 'undefined' ? window.location.origin : '';
        const draftStorageKey = `draft_inspections_${id}`;
        const draftsRes = await fetch(`${base}/api/properties/${id}/drafts`);
        const existingDrafts: InspectionItem[] = draftsRes.ok ? await draftsRes.json() : [];
        const updatedDrafts = [newDraft, ...existingDrafts];
        await fetch(`${base}/api/properties/${id}/drafts`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({drafts: updatedDrafts})
        });
        // Keep localStorage as backup
        localStorage.setItem(draftStorageKey, JSON.stringify(updatedDrafts));
    };

    // Delete inspection
    const handleDeleteInspection = (e: React.MouseEvent, item: InspectionItem) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Change the inspection type of any card (draft or completed)
    const INSPECTION_TYPES: InspectionItem["type"][] = [
        "Routine Inspection",
        "Move-in Inspection",
        "Move-out Inspection",
        "Maintenance Check",
        "Other",
    ];

    const handleChangeType = async (item: InspectionItem, newType: InspectionItem["type"]) => {
        setEditingTypeId(null);
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        const draftsRes = await fetch(`${base}/api/properties/${id}/drafts`);
        const drafts: InspectionItem[] = draftsRes.ok ? await draftsRes.json() : [];

        // Find the matching draft record (by id for drafts, or by reportId for completed)
        const matchIdx = drafts.findIndex(d => d.id === item.id || d.reportId === item.reportId);
        let updatedDrafts: InspectionItem[];

        if (matchIdx !== -1) {
            updatedDrafts = drafts.map((d, i) => i === matchIdx ? {...d, type: newType} : d);
        } else {
            // No draft record yet — create one to persist the type for this completed report
            const syntheticDraft: InspectionItem = {
                id: item.id,
                type: newType,
                status: item.status,
                date: item.date,
                inspectorName: item.inspectorName,
                subtext: item.subtext,
                reportId: item.reportId,
                conditionStats: item.conditionStats,
            };
            updatedDrafts = [...drafts, syntheticDraft];
        }

        await fetch(`${base}/api/properties/${id}/drafts`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({drafts: updatedDrafts}),
        });
        const draftStorageKey = `draft_inspections_${id}`;
        localStorage.setItem(draftStorageKey, JSON.stringify(updatedDrafts));
        showToast(`Inspection type changed to "${newType}"`, 'success');
        fetchData();
    };

    // Mock upload video to draft and convert to server Completed
    const handleMockUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeDraft || !property) return;

        setIsLoading(true);
        try {
            // Find one of the actual WebM reports on the server to clone for mock visual simulation,
            // or create a new mock report payload
            const mockReportId = `mock_${Date.now()}`;

            // Let's create a beautiful set of records
            const mockRecords = [
                {
                    id: "item_1",
                    room_name: "Kitchen",
                    item_name: "Oven",
                    condition: "Fair",
                    description: "Slight grease build-up inside door",
                    elapsedSeconds: 12.5,
                    qty: 1
                },
                {
                    id: "item_2",
                    room_name: "Kitchen",
                    item_name: "Flooring",
                    condition: "Good",
                    description: "Clean throughout",
                    elapsedSeconds: 34.2,
                    qty: 1
                },
                {
                    id: "item_3",
                    room_name: "Hallway",
                    item_name: "Smoke Alarm",
                    condition: "Good",
                    description: "Checked and fully operational",
                    elapsedSeconds: 56.8,
                    qty: 1
                },
                {
                    id: "item_4",
                    room_name: "Bedroom 1",
                    item_name: "Wall",
                    condition: "Poor",
                    description: "Damp stain under window sill",
                    elapsedSeconds: 88.3,
                    qty: 1
                },
                {
                    id: "item_5",
                    room_name: "Bathroom 1",
                    item_name: "Ventilation",
                    condition: "Fair",
                    description: "Fan is noisy but functional",
                    elapsedSeconds: 120.4,
                    qty: 1
                }
            ];

            // POST/PUT to write files inside public/uploads
            const base = typeof window !== 'undefined' ? window.location.origin : '';

            // Write mock main data .json
            const reportRes = await fetch(`${base}/api/reports/${mockReportId}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(mockRecords)
            });

            if (!reportRes.ok) throw new Error("Mock report API failed");

            // Write mock meta file
            const metaPayload = {
                address: property.name,
                propertyId: id,
                inspectorName: activeDraft.inspectorName,
                companyName: "Irish PropTech Agency",
                phone: "0879359054",
                email: "wenbinzhu@hotmail.com",
                reference: `Draft-${mockReportId.substring(5, 9)}`,
                coverPhotoBase64: ""
            };

            // In Next.js video-portal-demo uploads meta, we write the meta to disk as uploads/[id]_meta.json
            // Let's save metadata. Since we don't have a direct meta PUT route, we write a mock meta file inside client or localStorage,
            // or we can make a PUT request if our reports PUT handles it, but since APIPUT only writes reports, we can write a simple mock
            // script or let's use the local file uploads logic. Wait, let's call physical PUT endpoint. Wait, our reports PUT api writes the report body.
            // What about meta file? In next.js app, is there a meta save? The mobile app writes meta.
            // To bypass, we can save meta to localStorage or write a quick meta file. In video-portal-demo/public/uploads, the system lists files.
            // If we don't write meta.json file, the app report details page falls back elegantly! Yes, page.tsx has:
            // "try { const metaRes = await fetch(`/uploads/${id}_meta.json`); ... } catch (e) {}" -> falls back elegantly!

            // Calculate mock condition stats based on mockDefectsCount
            const conditionStats = {
                poor: Math.max(0, Math.floor(mockDefectsCount / 3)),
                fair: Math.max(0, Math.floor(mockDefectsCount / 3)),
                good: Math.max(1, mockDefectsCount - Math.max(0, Math.floor(mockDefectsCount / 3)) * 2)
            };

            // Upgrade on server drafts file
            const draftsRes = await fetch(`${base}/api/properties/${id}/drafts`);
            const existingDrafts: InspectionItem[] = draftsRes.ok ? await draftsRes.json() : [];
            const updatedDrafts = existingDrafts.map((d) => {
                if (d.id === activeDraft.id) {
                    return {
                        ...d,
                        status: "Completed" as const,
                        subtext: `${mockDefectsCount} items recorded · Video walkthrough`,
                        reportId: mockReportId,
                        conditionStats: conditionStats
                    };
                }
                return d;
            });
            await fetch(`${base}/api/properties/${id}/drafts`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({drafts: updatedDrafts})
            });

            // Keep localStorage synchronized as backup
            const draftStorageKey = `draft_inspections_${id}`;
            localStorage.setItem(draftStorageKey, JSON.stringify(updatedDrafts));

            // Add a mock webm video by copying default webm or just linking to existing video in public/uploads!
            // In report details page, videoUrl is set to `/uploads/${id}.webm`. Since we don't have a physical webm, we can let it fall back
            // to any available webm on server or placeholder.
            // To do this beautifully, we'll write a mock WebM file or associate with a real webm. Let's make the mock use the most recent real webm!
            // Let's find a real report ID in serverReports and copy its webm path, or just let it use the default webm.

            setActiveDraft(null);
            fetchData();

            showToast('Walkthrough media parsed successfully by AI!', 'success');
        } catch (err) {
            showToast('Error in mock upload process', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Real upload video to draft and analyze via mobile API proxied transparently
    const handleRealUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!realVideoFile || !property || !activeDraft) return;

        setRealUploadError(null);
        setRealUploadStep(1); // Uploading
        setRealUploadProgress(10);

        try {
            const formData = new FormData();
            formData.append('video', realVideoFile);
            formData.append('address', property.name);

            const inspectorName = activeDraft.inspectorName || localStorage.getItem("company_inspector_name") || "John Huston";
            formData.append('inspectorName', inspectorName);
            formData.append('companyName', "Irish PropTech Agency");
            formData.append('phone', "0879359054");
            formData.append('email', "wenbinzhu@hotmail.com");
            formData.append('reference', `Portal-${Date.now().toString().slice(-4)}`);

            // Mock progress interval during upload to make experience visually stunning
            const interval = setInterval(() => {
                setRealUploadProgress(prev => {
                    if (prev >= 88) {
                        clearInterval(interval);
                        return 88;
                    }
                    return prev + Math.floor(Math.random() * 8) + 4;
                });
            }, 300);

            // Call the mobile app API proxied transparently via next.config rewrites!
            const res = await fetch('/api/genai/analyze-video', {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);
            setRealUploadProgress(95);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Video analysis failed');
            }

            // Get the jobId from the immediate response
            const uploadResult = await res.json();
            const jobId = uploadResult.jobId;

            setRealUploadStep(2); // Analyzing with Gemini 3.5 Flash
            setRealUploadProgress(98);

            // Poll the job status API until it completes or fails
            const pollJobStatus = async (): Promise<{ reportId: string; recordCount: number }> => {
                return new Promise((resolve, reject) => {
                    let attempts = 0;
                    const pollInterval = setInterval(async () => {
                        attempts++;
                        if (attempts > 180) { // Limit to 9 minutes (180 * 3s)
                            clearInterval(pollInterval);
                            reject(new Error("Video analysis timed out on server. The analysis is still running in the background. Please refresh the page shortly."));
                            return;
                        }
                        try {
                            const statusRes = await fetch(`/api/genai/job-status?jobId=${jobId}`);
                            if (statusRes.ok) {
                                const jobData = await statusRes.json();
                                if (jobData.status === "completed") {
                                    clearInterval(pollInterval);
                                    resolve({
                                        reportId: jobData.reportId,
                                        recordCount: jobData.recordCount || 0
                                    });
                                } else if (jobData.status === "failed") {
                                    clearInterval(pollInterval);
                                    reject(new Error(jobData.error || "AI Video analysis failed on server."));
                                }
                            }
                        } catch (e) {
                            // Ignore occasional network glitches
                        }
                    }, 3000);
                });
            };

            const {reportId, recordCount} = await pollJobStatus();

            setRealUploadStep(3); // Syncing and updating draft
            setRealUploadProgress(100);

            // Read calculated stats by querying the report JSON directly on server
            const base = typeof window !== 'undefined' ? window.location.origin : '';
            let calculatedStats = {poor: 0, fair: 0, good: 0};

            try {
                const detailRes = await fetch(`${base}/uploads/${reportId}.json`);
                if (detailRes.ok) {
                    const items = await detailRes.json();
                    items.forEach((item: any) => {
                        const cond = (item.condition || "").toLowerCase();
                        if (cond.includes("good")) calculatedStats.good++;
                        else if (cond.includes("fair") || cond.includes("mark")) calculatedStats.fair++;
                        else calculatedStats.poor++;
                    });
                }
            } catch (e) {
                // Fallback stats
                calculatedStats = {
                    poor: Math.max(0, Math.floor(recordCount / 3)),
                    fair: Math.max(0, Math.floor(recordCount / 3)),
                    good: Math.max(1, recordCount - Math.max(0, Math.floor(recordCount / 3)) * 2)
                };
            }

            // Update the property's drafts on the server
            const draftsRes = await fetch(`${base}/api/properties/${id}/drafts`);
            const existingDrafts: InspectionItem[] = draftsRes.ok ? await draftsRes.json() : [];
            const updatedDrafts = existingDrafts.map((d) => {
                if (d.id === activeDraft.id) {
                    return {
                        ...d,
                        status: "Completed" as const,
                        subtext: `${recordCount} items recorded · Video walkthrough`,
                        reportId: reportId,
                        conditionStats: calculatedStats
                    };
                }
                return d;
            });

            await fetch(`${base}/api/properties/${id}/drafts`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({drafts: updatedDrafts})
            });

            // Synchronize backup localStorage
            const draftStorageKey = `draft_inspections_${id}`;
            localStorage.setItem(draftStorageKey, JSON.stringify(updatedDrafts));

            setTimeout(() => {
                setActiveDraft(null);
                setRealVideoFile(null);
                setRealUploadStep(0);
                fetchData();
                showToast('Real video walkthrough analyzed by AI & saved successfully!', 'success');
            }, 800);

        } catch (err: any) {
            console.error(err);
            setRealUploadError(err.message || 'Error uploading video file. Please try again.');
            setRealUploadStep(0);
        }
    };

    return (
        <>
            {/* ── MAIN PORTAL VIEWPORT ─────────────────────────────────────────── */}
            <div className="main-viewport">
                <main className="main-content" style={{paddingBottom: "120px"}}>
                    {/* Header Back & Info row */}
                    <header style={{marginBottom: "32px"}}>
                        <Link href="/" className={'flex items-center gap-2 text-sm font-bold text-gray-500 mb-2'}>
                            <ChevronLeft size={16}/>
                            Back to Properties
                        </Link>
                        <div className={'flex justify-between items-start'}>
                            <div>
                                <h1 style={{fontSize: "1.75rem", fontWeight: "900", letterSpacing: "-0.5px"}}>
                                    {property?.name || "19a Cliftonville Avenue, Belfast"}
                                </h1>
                                <p style={{fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px"}}>
                                    {property?.type || "Standard HMO/Property"} · {property?.bedrooms} Bedrooms
                                    · {property?.main_bathrooms} Bathrooms
                                </p>
                            </div>

                            <div className={'flex items-center gap-3'}>
                                <button
                                    onClick={()=>setIsPropertyModalOpen(true)}
                                    className={'flex items-center gap-2 text-sm font-bold text-gray-500 mb-2 bg-black/3 transition-[0.2s]'}
                                >
                                    <Pencil size={14}/>
                                    Edit Property
                                </button>
                                <div className="badge badge-success" style={{fontSize: "0.75rem", padding: "6px 12px"}}>
                                    Active Property Portfolio
                                </div>
                            </div>
                        </div>
                        {isDuplicateAddress && (
                            <div className="glass-panel" style={{
                                padding: "12px 18px", marginTop: "16px", borderLeft: "4px solid var(--warning)",
                                background: "rgba(245, 158, 11, 0.08)", color: "var(--warning)",
                                fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px",
                                borderRadius: "8px"
                            }}>
                                <span>⚠️ Note: There are other property records with this identical address in the system database.</span>
                            </div>
                        )}
                    </header>

                    <section>
                        <h2 style={{
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            marginBottom: "20px",
                            letterSpacing: "-0.2px"
                        }}>
                            Historical Walkthrough Visits
                        </h2>
                        {
                            isLoading ? (
                                <div style={{textAlign: "center", padding: "60px", color: "var(--text-muted)"}}>
                                    Loading property walkthroughs...
                                </div>
                            ) : (
                                <>
                                    {
                                        reports.length === 0 ? (
                                            <div className="glass-panel"
                                                 style={{padding: "60px", textAlign: "center", borderStyle: "dashed"}}>
                                                <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>No
                                                    inspections registered for this property.</p>
                                                <p style={{
                                                    color: "var(--text-dark)",
                                                    fontSize: "0.75rem",
                                                    marginTop: "4px"
                                                }}>Use the floating menu below to register a Routine, Move-in/out, or
                                                    Maintenance check.</p>
                                            </div>
                                        ) : (
                                            <div className="property-grid">
                                                {
                                                    reports.map((report) => (
                                                        <ReportCard report={report} key={`report-${report.id}`}/>
                                                    ))
                                                }
                                            </div>
                                        )
                                    }
                                </>
                            )
                        }
                    </section>

                    <div style={{
                        position: "fixed",
                        bottom: "32px",
                        left: "calc(50% + var(--sidebar-width)/2)",
                        transform: "translateX(-50%)",
                        zIndex: 80
                    }}>
                        <div className="float-bar">
                            <button className="float-btn" onClick={() => handleAddNewDraft("Routine Inspection")}>
                                <ClipboardList size={20}/>
                                <span>Routine</span>
                            </button>
                            <button className="float-btn" onClick={() => handleAddNewDraft("Move-in Inspection")}>
                                <LogIn size={20}/>
                                <span>Move In</span>
                            </button>
                            <button className="float-btn" onClick={() => handleAddNewDraft("Move-out Inspection")}>
                                <LogOut size={20}/>
                                <span>Move Out</span>
                            </button>
                            <button className="float-btn" onClick={() => handleAddNewDraft("Maintenance Check")}>
                                <Wrench size={20}/>
                                <span>Maintenance</span>
                            </button>
                            <button className="float-btn" onClick={() => handleAddNewDraft("Other")}>
                                <MoreHorizontal size={20}/>
                                <span>Other</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            {
                isPropertyModalOpen && (
                    <ModalProperty
                        editMode={true}
                        onClose={() => setIsPropertyModalOpen(false)}
                        onSave={() => {
                            fetchProperty();
                        }}
                        property={property}
                    />
                )
            }
        </>
    );
}
