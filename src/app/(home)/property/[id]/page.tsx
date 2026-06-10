"use client";

import {useState, useEffect, useRef} from "react";
import {useParams, useRouter} from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft, Trash2, Plus, FileText, ClipboardList, Wrench, LogIn, LogOut, MoreHorizontal,
    Sparkles, Home as HomeIcon, BarChart3, Settings, User, Sun, Moon, X, Check, Eye, Play, Pencil
} from "lucide-react";
import Autocomplete from "react-google-autocomplete";

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
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Data States
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

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void
    } | null>(null);
    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmDialog({open: true, title, message, onConfirm});
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

    // Edit Property Form States
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState("Detached House");
    const [editImage, setEditImage] = useState<string>("");
    const [editKitchenType, setEditKitchenType] = useState<"Kitchen" | "Kitchen/Living">("Kitchen/Living");
    const [editBedrooms, setEditBedrooms] = useState(1);
    const [editBathrooms, setEditBathrooms] = useState(1);
    const [editEnsuite, setEditEnsuite] = useState(0);
    const [editLivingRooms, setEditLivingRooms] = useState(1);
    const [editStoreys, setEditStoreys] = useState(2);
    const [editHallway, setEditHallway] = useState(true);
    const [editOutdoor, setEditOutdoor] = useState(false);
    const [editStudy, setEditStudy] = useState(false);
    const [editUtility, setEditUtility] = useState(false);
    const [editGuestWc, setEditGuestWc] = useState(false);
    const [editStorage, setEditStorage] = useState(false);

    const handleOpenEditModal = () => {
        if (!property) return;
        setEditName(property.name);
        setEditType(property.type);

        // Find a fallback cover image from associated inspections if property.image is empty!
        let initialImage = property.image || "";
        if (!initialImage) {
            const completedVisit = inspections.find(ins => ins.status === "Completed" && ins.reportId);
            if (completedVisit && completedVisit.reportId) {
                initialImage = `/uploads/${completedVisit.reportId}_cover.jpg`;
            }
        }
        setEditImage(initialImage);

        setEditKitchenType((property.rooms.kitchenType as any) || "Kitchen/Living");
        setEditBedrooms(property.rooms.bedrooms);
        setEditBathrooms(property.rooms.bathrooms);
        setEditEnsuite(property.rooms.ensuite ?? 0);
        setEditLivingRooms(property.rooms.livingRooms ?? 1);
        setEditStoreys(property.rooms.storeys ?? 2);
        setEditHallway(property.rooms.hallway);
        setEditOutdoor(property.rooms.outdoor);
        setEditStudy(property.rooms.study ?? false);
        setEditUtility(property.rooms.utility ?? false);
        setEditGuestWc(property.rooms.guestWc ?? false);
        setEditStorage(property.rooms.storage ?? false);
        setIsEditOpen(true);
    };

    const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditPropertySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName.trim()) {
            showToast("Please enter a property name/address", "warning");
            return;
        }
        const updatedProp = {
            name: editName,
            type: editType,
            image: editImage || undefined,
            rooms: {
                kitchenType: editKitchenType,
                bedrooms: editBedrooms,
                bathrooms: editBathrooms,
                ensuite: editEnsuite,
                livingRooms: editLivingRooms,
                storeys: editStoreys,
                hallway: editHallway,
                outdoor: editOutdoor,
                study: editStudy,
                utility: editUtility,
                guestWc: editGuestWc,
                storage: editStorage,
            }
        };

        try {
            const base = typeof window !== "undefined" ? window.location.origin : "";
            const res = await fetch(`${base}/api/properties/${id}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(updatedProp),
            });
            if (!res.ok) throw new Error("Failed to update property");
            showToast("Property updated successfully", "success");
            setIsEditOpen(false);
            fetchData();
        } catch (err) {
            showToast("Error updating property", "error");
        }
    };

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

    // Fetch data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch current property from server API
            const base = typeof window !== 'undefined' ? window.location.origin : '';
            const propsRes = await fetch(`${base}/api/properties`);
            let currentProperty: Property | null = null;
            let allProps: Property[] = [];
            if (propsRes.ok) {
                allProps = await propsRes.json();
                currentProperty = allProps.find(p => p.id === id) || null;
            }
            // Fallback to localStorage if server doesn't have it
            if (!currentProperty) {
                const savedProperties = localStorage.getItem('properties_db');
                if (savedProperties) {
                    allProps = JSON.parse(savedProperties);
                    currentProperty = allProps.find(p => p.id === id) || null;
                }
            }
            if (currentProperty) {
                setProperty(currentProperty);
                const cleanCurrent = cleanAddress(currentProperty.name);
                const isDuplicate = allProps.some(p => p.id !== currentProperty?.id && cleanAddress(p.name) === cleanCurrent);
                setIsDuplicateAddress(isDuplicate);
            }

            if (!currentProperty) {
                setIsLoading(false);
                return;
            }

            // 2. Fetch completed reports from server
            const res = await fetch(`${base}/api/reports`);
            if (!res.ok) throw new Error('Failed to fetch reports');
            const reportsList: ReportSummary[] = await res.json();

            const enhancedReports: ReportSummary[] = await Promise.all(reportsList.map(async (rep: any) => {
                try {
                    const detailRes = await fetch(`${base}/uploads/${rep.id}.json`);
                    if (detailRes.ok) {
                        const items = await detailRes.json();
                        const stats = {poor: 0, fair: 0, good: 0};
                        items.forEach((item: any) => {
                            const cond = (item.condition || "").toLowerCase();
                            if (cond.includes("good")) stats.good++;
                            else if (cond.includes("fair") || cond.includes("mark")) stats.fair++;
                            else stats.poor++;
                        });
                        return {...rep, conditionStats: stats};
                    }
                } catch (e) {
                }
                return {
                    ...rep,
                    conditionStats: {
                        poor: Math.max(0, rep.defectCount - 2),
                        fair: Math.min(2, rep.defectCount),
                        good: 12
                    }
                };
            }));

            setServerReports(enhancedReports);

            // 3. Load draft inspections from server API
            const draftsRes = await fetch(`${base}/api/properties/${id}/drafts`);
            const draftInspections: InspectionItem[] = draftsRes.ok ? await draftsRes.json() : [];

            // 4. Filter reports that match the property address
            const propClean = cleanAddress(currentProperty.name);
            const hasExplicitVisits = draftInspections.length > 0;

            const completedInspections: InspectionItem[] = enhancedReports
                .filter(rep => {
                    const repClean = cleanAddress(rep.address || "");
                    const isAddressMatch = repClean.includes(propClean) || propClean.includes(repClean);

                    if (hasExplicitVisits) {
                        // Only show completed reports that are explicitly linked in draftInspections
                        return isAddressMatch && draftInspections.some(d => d.reportId === rep.id);
                    } else {
                        // Fallback for pre-existing properties: show all address-matching completed reports
                        return isAddressMatch;
                    }
                })
                .map(rep => {
                    // If the report is linked to an explicit draft inspection, use the draft's custom type!
                    const explicitDraft = draftInspections.find(d => d.reportId === rep.id);
                    return {
                        id: rep.id,
                        type: explicitDraft ? explicitDraft.type : "Other",
                        status: "Completed",
                        date: new Date(rep.timestamp).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        }),
                        inspectorName: rep.inspectorName || "AI System",
                        subtext: explicitDraft ? explicitDraft.subtext : `${rep.defectCount} items extracted by AI`,
                        reportId: rep.id,
                        conditionStats: rep.conditionStats,
                        isSigned: rep.isSigned
                    };
                });

            // Filter out duplicate completed visits from the drafts list
            const linkedReportIds = new Set(completedInspections.map(c => c.reportId).filter(Boolean));
            const filteredDraftInspections = draftInspections.filter(d => !d.reportId || !linkedReportIds.has(d.reportId));

            // Combine Completed + Drafts chronologically (most recent first)
            const allInspections = [...completedInspections, ...filteredDraftInspections]
                .sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a));
            setInspections(allInspections);

        } catch (err) {
            console.error("Error loading property detail:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    // Close type dropdown when clicking outside
    useEffect(() => {
        if (!editingTypeId) return;
        const handler = () => setEditingTypeId(null);
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [editingTypeId]);

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

        // Refresh page inspections list
        fetchData();
    };

    // Delete inspection
    const handleDeleteInspection = (e: React.MouseEvent, item: InspectionItem) => {
        e.preventDefault();
        e.stopPropagation();

        showConfirm(
            'Delete Inspection',
            `Are you sure you want to delete this ${item.type}? This action cannot be undone.`,
            async () => {
                if (item.status === "Draft") {
                    // Remove from server drafts
                    const base = typeof window !== 'undefined' ? window.location.origin : '';
                    const draftsRes = await fetch(`${base}/api/properties/${id}/drafts`);
                    const drafts: InspectionItem[] = draftsRes.ok ? await draftsRes.json() : [];
                    const updated = drafts.filter(d => d.id !== item.id);
                    await fetch(`${base}/api/properties/${id}/drafts`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({drafts: updated})
                    });
                    // Also clean localStorage
                    const draftStorageKey = `draft_inspections_${id}`;
                    localStorage.setItem(draftStorageKey, JSON.stringify(updated));
                    fetchData();
                } else {
                    // Completed, trigger DELETE server API
                    try {
                        const base = typeof window !== 'undefined' ? window.location.origin : '';
                        const res = await fetch(`${base}/api/reports/${item.id}`, {method: 'DELETE'});
                        if (!res.ok) throw new Error('Failed to delete report');
                        fetchData();
                    } catch (err) {
                        showToast('Error deleting report from server', 'error');
                    }
                }
            }
        );
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
                        <Link href="/" style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "var(--text-muted)",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                            marginBottom: "8px"
                        }}>
                            <ChevronLeft size={16}/>
                            Back to Properties
                        </Link>
                        <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                            <div>
                                <h1 style={{fontSize: "1.75rem", fontWeight: "900", letterSpacing: "-0.5px"}}>
                                    {property?.name || "19a Cliftonville Avenue, Belfast"}
                                </h1>
                                <p style={{fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px"}}>
                                    {property?.type || "Standard HMO/Property"} · {property?.rooms.bedrooms} Bedrooms
                                    · {property?.rooms.bathrooms} Bathrooms
                                </p>
                            </div>

                            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                <button
                                    onClick={handleOpenEditModal}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "6px 12px",
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        borderRadius: "8px",
                                        border: "1px solid var(--panel-border)",
                                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                                        color: "var(--foreground)",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
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

                    {/* Inspections Cards Grid */}
                    <section>
                        <h2 style={{
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            marginBottom: "20px",
                            letterSpacing: "-0.2px"
                        }}>
                            Historical Walkthrough Visits
                        </h2>

                        {isLoading ? (
                            <div style={{textAlign: "center", padding: "60px", color: "var(--text-muted)"}}>
                                Loading property walkthroughs...
                            </div>
                        ) : inspections.length === 0 ? (
                            <div className="glass-panel"
                                 style={{padding: "60px", textAlign: "center", borderStyle: "dashed"}}>
                                <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>No inspections registered
                                    for this property.</p>
                                <p style={{color: "var(--text-dark)", fontSize: "0.75rem", marginTop: "4px"}}>Use the
                                    floating menu below to register a Routine, Move-in/out, or Maintenance check.</p>
                            </div>
                        ) : (
                            <div className="property-grid">
                                {inspections.map((item) => {
                                    const cardContent = (
                                        <div className="property-card-content" style={{
                                            flex: 1,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between"
                                        }}>
                                            <div>
                                                <div style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "flex-start"
                                                }}>
                                                    {/* Inline type editor */}
                                                    <div style={{position: "relative", flex: 1}}>
                                                        {editingTypeId === item.id ? (
                                                            // Dropdown overlay
                                                            <div
                                                                style={{
                                                                    position: "absolute",
                                                                    top: 0,
                                                                    left: 0,
                                                                    zIndex: 50,
                                                                    background: "var(--panel-bg)",
                                                                    border: "1px solid var(--primary)",
                                                                    borderRadius: "10px",
                                                                    padding: "6px",
                                                                    boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
                                                                    minWidth: "200px"
                                                                }}
                                                            >
                                                                {INSPECTION_TYPES.map(t => (
                                                                    <button
                                                                        key={t}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            handleChangeType(item, t);
                                                                        }}
                                                                        style={{
                                                                            display: "block",
                                                                            width: "100%",
                                                                            textAlign: "left",
                                                                            padding: "8px 12px",
                                                                            border: "none",
                                                                            borderRadius: "7px",
                                                                            background: item.type === t ? "rgba(99,102,241,0.22)" : "transparent",
                                                                            color: item.type === t ? "var(--primary)" : "var(--foreground)",
                                                                            fontWeight: item.type === t ? "bold" : "normal",
                                                                            fontSize: "0.82rem",
                                                                            cursor: "pointer",
                                                                            transition: "background 0.15s"
                                                                        }}
                                                                    >
                                                                        {t}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <h3 style={{
                                                                margin: 0,
                                                                fontSize: "1.1rem",
                                                                fontWeight: "bold",
                                                                lineHeight: "1.3",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "6px"
                                                            }}>
                                                                {item.type}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setEditingTypeId(item.id);
                                                                    }}
                                                                    title="Change inspection type"
                                                                    style={{
                                                                        background: "none",
                                                                        border: "none",
                                                                        cursor: "pointer",
                                                                        padding: "2px 4px",
                                                                        borderRadius: "5px",
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        color: "var(--text-muted)",
                                                                        transition: "color 0.15s"
                                                                    }}
                                                                >
                                                                    <Pencil size={12}/>
                                                                </button>
                                                            </h3>
                                                        )}
                                                    </div>
                                                    <div style={{display: "flex", gap: "6px", alignItems: "center"}}>
                            <span
                                className={`badge ${item.status === "Completed" ? "badge-success" : "badge-warning"}`}>
                              {item.status}
                            </span>
                                                        <span
                                                            className={`badge ${item.isSigned ? "badge-success" : "badge-danger"}`}>
                              {item.isSigned ? "✍️ Signed" : "⏳ Unsigned"}
                            </span>
                                                    </div>
                                                </div>
                                                <p style={{
                                                    fontSize: "0.75rem",
                                                    color: "var(--text-muted)",
                                                    marginTop: "4px"
                                                }}>
                                                    {item.date} · by {item.inspectorName}
                                                </p>
                                                <div style={{marginTop: "6px"}}>
                          <span style={{
                              fontSize: "0.7rem",
                              fontFamily: "monospace",
                              padding: "3px 6px",
                              borderRadius: "6px",
                              backgroundColor: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid var(--panel-border)",
                              color: "var(--text-muted)"
                          }}>
                            {item.reportId ? `Report ID: #${item.reportId}` : `Draft ID: #${item.id}`}
                          </span>
                                                </div>

                                                <p style={{
                                                    fontSize: "0.8rem",
                                                    color: "var(--text-dark)",
                                                    marginTop: "14px",
                                                    fontStyle: item.status === "Draft" ? "italic" : "normal"
                                                }}>
                                                    {item.subtext}
                                                </p>
                                            </div>

                                            {/* Defect aggregate counts if completed */}
                                            {item.status === "Completed" && item.conditionStats && (
                                                <div className="room-badge-row" style={{
                                                    marginTop: "12px",
                                                    borderTop: "1px solid var(--panel-border)",
                                                    paddingTop: "12px"
                                                }}>
                                                    {item.conditionStats.poor > 0 && (
                                                        <span
                                                            className="room-badge room-badge-poor">{item.conditionStats.poor} Poor</span>
                                                    )}
                                                    {item.conditionStats.fair > 0 && (
                                                        <span
                                                            className="room-badge room-badge-fair">{item.conditionStats.fair} Fair</span>
                                                    )}
                                                    {item.conditionStats.good > 0 && (
                                                        <span
                                                            className="room-badge room-badge-good">{item.conditionStats.good} Good</span>
                                                    )}
                                                </div>
                                            )}

                                            <div style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                borderTop: "1px solid var(--panel-border)",
                                                paddingTop: "12px",
                                                marginTop: "12px"
                                            }}>
                        <span style={{
                            fontSize: "0.75rem",
                            color: "var(--primary)",
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                        }}>
                          {item.status === "Completed" ? (
                              <>
                                  <Play size={12}/>
                                  Open Interactive Portal
                              </>
                          ) : (
                              <>
                                  <Plus size={12}/>
                                  Upload Media walkthrough
                              </>
                          )}
                        </span>

                                                <button
                                                    onClick={(e) => handleDeleteInspection(e, item)}
                                                    style={{
                                                        width: "32px",
                                                        height: "32px",
                                                        borderRadius: "8px",
                                                        border: "none",
                                                        backgroundColor: "var(--danger-bg)",
                                                        color: "var(--danger)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    );

                                    if (item.status === "Completed" && item.reportId) {
                                        const hasMetaCover = serverReports.find(r => r.id === item.reportId)?.coverPhoto;
                                        const itemCover = hasMetaCover
                                            ? `/uploads/${hasMetaCover}`
                                            : `/uploads/${item.reportId}_cover.jpg`;
                                        return (
                                            <Link
                                                href={`/report/${item.reportId}`}
                                                key={item.id}
                                                className="glass-panel glass-panel-hover property-card"
                                                style={{height: "360px", textDecoration: "none", color: "inherit"}}
                                            >
                                                <div className="property-image-wrapper" style={{height: "140px"}}>
                                                    <img
                                                        src={itemCover}
                                                        alt="Walkthrough Cover"
                                                        className="property-image"
                                                        onError={(e) => {
                                                            e.currentTarget.src = property?.image || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80";
                                                        }}
                                                    />
                                                </div>
                                                {cardContent}
                                            </Link>
                                        );
                                    } else {
                                        return (
                                            <div
                                                onClick={() => setActiveDraft(item)}
                                                key={item.id}
                                                className="glass-panel glass-panel-hover property-card"
                                                style={{height: "360px", cursor: "pointer"}}
                                            >
                                                <div className="property-image-wrapper" style={{height: "140px"}}>
                                                    <img
                                                        src={property?.image || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80"}
                                                        alt="Property Cover"
                                                        className="property-image"
                                                        onError={(e) => {
                                                            e.currentTarget.src = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80";
                                                        }}
                                                    />
                                                </div>
                                                {cardContent}
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        )}
                    </section>

                    {/* ── FLOAT ACTION GLASS BAR ─────────────────────────────────────── */}
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

            {/* ── WALKTHROUGH MEDIA ASSOCIATION MODAL (REAL AI & DEMO SIMULATION) ── */}
            {activeDraft && (
                <div className="modal-backdrop" onClick={() => {
                    if (realUploadStep === 0) setActiveDraft(null);
                }}>
                    <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()}
                         style={{maxWidth: "550px", position: "relative", overflow: "hidden"}}>

                        {/* Real AI Upload Progress Overlay */}
                        {realUploadStep > 0 && (
                            <div style={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 90,
                                background: "rgba(14, 17, 26, 0.96)",
                                backdropFilter: "blur(12px)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "32px",
                                textAlign: "center",
                                animation: "fadeIn 0.3s ease-out"
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
                                                strokeDashoffset={251.2 - (251.2 * realUploadProgress) / 100}
                                                style={{
                                                    transition: "stroke-dashoffset 0.3s ease",
                                                    strokeLinecap: "round"
                                                }}
                                        />
                                    </svg>
                                    <span style={{
                                        fontSize: "1.3rem",
                                        fontWeight: "900",
                                        color: "white"
                                    }}>{realUploadProgress}%</span>
                                </div>

                                <h4 style={{
                                    margin: "0 0 8px 0",
                                    fontSize: "1.1rem",
                                    fontWeight: "bold",
                                    color: "white"
                                }}>
                                    {realUploadStep === 1 && "Uploading video file to Gemini..."}
                                    {realUploadStep === 2 && "Gemini 3.5 Flash sound & visual parsing..."}
                                    {realUploadStep === 3 && "Updating property database and report..."}
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
                            <h3 style={{margin: 0, fontSize: "1.2rem", fontWeight: "bold"}}>Associate Walkthrough
                                Media</h3>
                            <button
                                onClick={() => setActiveDraft(null)}
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

                            {/* Premium Tab Switcher */}
                            <div style={{
                                display: "flex",
                                backgroundColor: "rgba(255,255,255,0.04)",
                                padding: "4px",
                                borderRadius: "12px",
                                gap: "4px"
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setAssociationMode("real")}
                                    style={{
                                        flex: 1,
                                        padding: "8px 12px",
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        border: "none",
                                        borderRadius: "8px",
                                        backgroundColor: associationMode === "real" ? "var(--primary)" : "transparent",
                                        color: associationMode === "real" ? "white" : "var(--text-muted)",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    🎥 Real AI Analysis (真实 AI 分析)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAssociationMode("demo")}
                                    style={{
                                        flex: 1,
                                        padding: "8px 12px",
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        border: "none",
                                        borderRadius: "8px",
                                        backgroundColor: associationMode === "demo" ? "var(--primary)" : "transparent",
                                        color: associationMode === "demo" ? "white" : "var(--text-muted)",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    🧪 Demo Simulation (演示模拟)
                                </button>
                            </div>

                            {associationMode === "real" ? (
                                /* --- REAL UPLOAD MODE --- */
                                <form onSubmit={handleRealUploadSubmit}
                                      style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                                    <p style={{
                                        fontSize: "0.85rem",
                                        color: "var(--text-muted)",
                                        margin: 0,
                                        lineHeight: "1.4"
                                    }}>
                                        This is a <strong>{activeDraft.type}</strong> visit. Choose a recorded
                                        walkthrough video file to analyze its real-world room assets and structural
                                        defects.
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
                                            <span style={{
                                                fontSize: "0.85rem",
                                                fontWeight: "bold",
                                                color: "var(--foreground)"
                                            }}>Choose walkthrough video file</span>
                                            <span style={{
                                                fontSize: "0.75rem",
                                                color: "var(--text-muted)",
                                                marginTop: "4px"
                                            }}>MP4, WebM, MOV up to 500MB</span>
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
                                        <button type="button" onClick={() => setActiveDraft(null)}
                                                className="sheet-select" style={{padding: "10px 20px"}}>Cancel
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
                            ) : (
                                /* --- SIMULATED DEMO MODE --- */
                                <form onSubmit={handleMockUploadSubmit}
                                      style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                                    <p style={{
                                        fontSize: "0.85rem",
                                        color: "var(--text-muted)",
                                        margin: 0,
                                        lineHeight: "1.4"
                                    }}>
                                        This is a <strong>{activeDraft.type}</strong> visit. Under simulation mode, you
                                        can associate a pre-recorded standard walkthrough video source to fast-track
                                        test UI.
                                    </p>

                                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                        <label style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "bold",
                                            color: "var(--text-muted)"
                                        }}>Walkthrough Video File</label>
                                        <select
                                            className="sheet-select"
                                            value={videoToAssociate}
                                            onChange={(e) => setVideoToAssociate(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Choose walkthrough source --</option>
                                            <option value="recent">Irish Standard 54 Carmel.webm (150MB)</option>
                                            <option value="routine">Routine Walkthrough B.webm (90MB)</option>
                                        </select>
                                    </div>

                                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                        <label style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "bold",
                                            color: "var(--text-muted)"
                                        }}>Simulated AI Extracted Defects</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            className="sheet-input"
                                            value={mockDefectsCount}
                                            onChange={(e) => setMockDefectsCount(parseInt(e.target.value) || 5)}
                                        />
                                    </div>

                                    <div style={{
                                        padding: "16px 0 0 0",
                                        borderTop: "1px solid var(--panel-border)",
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: "12px"
                                    }}>
                                        <button type="button" onClick={() => setActiveDraft(null)}
                                                className="sheet-select" style={{padding: "10px 20px"}}>Cancel
                                        </button>
                                        <button type="submit" style={{
                                            padding: "0 20px",
                                            backgroundColor: "var(--primary)",
                                            border: "none",
                                            borderRadius: "8px",
                                            color: "white",
                                            fontWeight: "bold",
                                            height: "38px",
                                            cursor: "pointer"
                                        }}>
                                            Run Demo Simulation
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── ORGANISATION SETTINGS OVERLAY ─────────────────────────────────── */}
            {isSettingsOpen && (
                <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
                    <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()}
                         style={{maxWidth: "550px"}}>
                        <div style={{
                            padding: "20px 24px",
                            borderBottom: "1px solid var(--panel-border)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <h3 style={{margin: 0, fontSize: "1.2rem", fontWeight: "bold"}}>Organisation Settings</h3>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
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
                            <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                <label style={{fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)"}}>Company
                                    Name</label>
                                <input type="text" className="sheet-input" defaultValue="Irish PropTech Agency"/>
                            </div>
                            <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                <label style={{fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)"}}>Active
                                    Field Inspector</label>
                                <input
                                    type="text"
                                    className="sheet-input"
                                    defaultValue="John Huston"
                                    onChange={(e) => localStorage.setItem("company_inspector_name", e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{
                            padding: "16px 24px",
                            borderTop: "1px solid var(--panel-border)",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "12px"
                        }}>
                            <button onClick={() => setIsSettingsOpen(false)} className="sheet-select"
                                    style={{padding: "10px 20px"}}>Close
                            </button>
                            <button onClick={() => {
                                setIsSettingsOpen(false);
                                showToast('Settings saved!', 'success');
                                fetchData();
                            }} style={{
                                padding: "0 20px",
                                backgroundColor: "var(--primary)",
                                border: "none",
                                borderRadius: "8px",
                                color: "white",
                                fontWeight: "bold",
                                height: "38px",
                                cursor: "pointer"
                            }}>Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT PROPERTY DIALOG WIZARD ────────────────────────────────────── */}
            {isEditOpen && (
                <div className="modal-backdrop" onClick={() => setIsEditOpen(false)}>
                    <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()}
                         style={{maxWidth: "750px"}}>
                        {/* Header */}
                        <div style={{
                            padding: "20px 24px",
                            borderBottom: "1px solid var(--panel-border)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <h3 style={{margin: 0, fontSize: "1.2rem", fontWeight: "bold"}}>Edit Property</h3>
                            <button
                                onClick={() => setIsEditOpen(false)}
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

                        {/* Form */}
                        <form onSubmit={handleEditPropertySubmit}
                              style={{display: "flex", flexDirection: "column", flex: 1, overflow: "hidden"}}>
                            <div style={{
                                padding: "24px",
                                overflowY: "auto",
                                flex: 1,
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "24px"
                            }}>

                                {/* Left Column */}
                                <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                        <label style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "bold",
                                            color: "var(--text-muted)"
                                        }}>Property Name/Address</label>
                                        <Autocomplete
                                            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                            onPlaceSelected={(place: any) => {
                                                if (place.formatted_address) setEditName(place.formatted_address);
                                                else if (place.name) setEditName(place.name);
                                            }}
                                            options={{
                                                types: [],
                                                componentRestrictions: {country: ["ie", "gb"]}
                                            }}
                                            className="sheet-input"
                                            placeholder="e.g. 123 Main St, Belfast"
                                            defaultValue={editName}
                                            onChange={(e: any) => setEditName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                        <label style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "bold",
                                            color: "var(--text-muted)"
                                        }}>Property Type</label>
                                        <select
                                            className="sheet-select"
                                            value={editType}
                                            onChange={(e) => setEditType(e.target.value)}
                                        >
                                            <option value="Detached House">Detached House (独立别墅)</option>
                                            <option value="Semi-Detached House">Semi-Detached House (半独立住宅)
                                            </option>
                                            <option value="Terraced House / Townhouse">Terraced House / Townhouse
                                                (联排别墅)
                                            </option>
                                            <option value="Apartment / Flat">Apartment / Flat (公寓/单元房)</option>
                                            <option value="Bungalow">Bungalow (平房/单层独栋)</option>
                                            <option value="Duplex / Maisonette">Duplex / Maisonette (复式住宅)</option>
                                            <option value="Standard HMO / Co-Living">Standard HMO / Co-Living
                                                (多人合租房/联合居住)
                                            </option>
                                            <option value="Commercial Property">Commercial Property (商业物业)</option>
                                        </select>
                                    </div>

                                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                        <label style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "bold",
                                            color: "var(--text-muted)"
                                        }}>Property Image (Optional)</label>
                                        <div style={{
                                            height: "120px",
                                            border: "2px dashed var(--panel-border)",
                                            borderRadius: "12px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            position: "relative",
                                            overflow: "hidden",
                                            backgroundColor: "rgba(255,255,255,0.01)"
                                        }}>
                                            {editImage ? (
                                                <>
                                                    <img
                                                        src={editImage}
                                                        style={{width: "100%", height: "100%", objectFit: "cover"}}
                                                        onError={(e) => {
                                                            e.currentTarget.src = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80";
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditImage("")}
                                                        style={{
                                                            position: "absolute",
                                                            top: "8px",
                                                            right: "8px",
                                                            width: "28px",
                                                            height: "28px",
                                                            borderRadius: "50%",
                                                            border: "none",
                                                            backgroundColor: "rgba(0,0,0,0.6)",
                                                            color: "white",
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center"
                                                        }}
                                                    >
                                                        <X size={14}/>
                                                    </button>
                                                </>
                                            ) : (
                                                <div style={{
                                                    textAlign: "center",
                                                    margin: "auto",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: "6px"
                                                }}>
                                                    <span style={{fontSize: "0.75rem", color: "var(--text-muted)"}}>Choose a cover image</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleEditImageUpload}
                                                        style={{fontSize: "0.7rem", width: "180px"}}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column (Rooms) */}
                                <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                        <label style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "bold",
                                            color: "var(--text-muted)"
                                        }}>Kitchen Type</label>
                                        <div style={{display: "flex", gap: "10px"}}>
                                            <button
                                                type="button"
                                                onClick={() => setEditKitchenType("Kitchen")}
                                                style={{
                                                    flex: 1,
                                                    padding: "10px",
                                                    borderRadius: "8px",
                                                    border: "1px solid",
                                                    cursor: "pointer",
                                                    fontWeight: "bold",
                                                    fontSize: "0.8rem",
                                                    borderColor: editKitchenType === "Kitchen" ? "var(--primary)" : "var(--panel-border)",
                                                    backgroundColor: editKitchenType === "Kitchen" ? "var(--primary-bg)" : "transparent",
                                                    color: editKitchenType === "Kitchen" ? "var(--primary)" : "var(--text-muted)"
                                                }}
                                            >
                                                Standard Kitchen
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditKitchenType("Kitchen/Living")}
                                                style={{
                                                    flex: 1,
                                                    padding: "10px",
                                                    borderRadius: "8px",
                                                    border: "1px solid",
                                                    cursor: "pointer",
                                                    fontWeight: "bold",
                                                    fontSize: "0.8rem",
                                                    borderColor: editKitchenType === "Kitchen/Living" ? "var(--primary)" : "var(--panel-border)",
                                                    backgroundColor: editKitchenType === "Kitchen/Living" ? "var(--primary-bg)" : "transparent",
                                                    color: editKitchenType === "Kitchen/Living" ? "var(--primary)" : "var(--text-muted)"
                                                }}
                                            >
                                                Kitchen/Living Combo
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "14px",
                                        borderBottom: "1px solid var(--panel-border)",
                                        paddingBottom: "14px"
                                    }}>
                                        {/* Bedrooms Count */}
                                        <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                            <label style={{
                                                fontSize: "0.8rem",
                                                fontWeight: "bold",
                                                color: "var(--text-muted)"
                                            }}>Bedrooms</label>
                                            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                                <button type="button"
                                                        onClick={() => setEditBedrooms(Math.max(1, editBedrooms - 1))}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>-
                                                </button>
                                                <span style={{fontWeight: "bold"}}>{editBedrooms}</span>
                                                <button type="button" onClick={() => setEditBedrooms(editBedrooms + 1)}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>+
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bathrooms Count */}
                                        <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                            <label style={{
                                                fontSize: "0.8rem",
                                                fontWeight: "bold",
                                                color: "var(--text-muted)"
                                            }}>Main Bathrooms</label>
                                            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                                <button type="button"
                                                        onClick={() => setEditBathrooms(Math.max(1, editBathrooms - 1))}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>-
                                                </button>
                                                <span style={{fontWeight: "bold"}}>{editBathrooms}</span>
                                                <button type="button"
                                                        onClick={() => setEditBathrooms(editBathrooms + 1)}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>+
                                                </button>
                                            </div>
                                        </div>

                                        {/* Ensuite Count */}
                                        <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                            <label style={{
                                                fontSize: "0.8rem",
                                                fontWeight: "bold",
                                                color: "var(--text-muted)"
                                            }}>Ensuite Bathrooms</label>
                                            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                                <button type="button"
                                                        onClick={() => setEditEnsuite(Math.max(0, editEnsuite - 1))}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>-
                                                </button>
                                                <span style={{fontWeight: "bold"}}>{editEnsuite}</span>
                                                <button type="button" onClick={() => setEditEnsuite(editEnsuite + 1)}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>+
                                                </button>
                                            </div>
                                        </div>

                                        {/* Living Rooms Count */}
                                        <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                            <label style={{
                                                fontSize: "0.8rem",
                                                fontWeight: "bold",
                                                color: "var(--text-muted)"
                                            }}>Living/Sitting Rooms</label>
                                            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                                <button type="button"
                                                        onClick={() => setEditLivingRooms(Math.max(0, editLivingRooms - 1))}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>-
                                                </button>
                                                <span style={{fontWeight: "bold"}}>{editLivingRooms}</span>
                                                <button type="button"
                                                        onClick={() => setEditLivingRooms(editLivingRooms + 1)}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>+
                                                </button>
                                            </div>
                                        </div>

                                        {/* Storeys Count */}
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "6px",
                                            gridColumn: "span 2"
                                        }}>
                                            <label style={{
                                                fontSize: "0.8rem",
                                                fontWeight: "bold",
                                                color: "var(--text-muted)"
                                            }}>Floors / Storeys</label>
                                            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                                <button type="button"
                                                        onClick={() => setEditStoreys(Math.max(1, editStoreys - 1))}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>-
                                                </button>
                                                <span
                                                    style={{fontWeight: "bold"}}>{editStoreys} Storey{editStoreys > 1 ? "s" : ""}</span>
                                                <button type="button" onClick={() => setEditStoreys(editStoreys + 1)}
                                                        className="sheet-select" style={{padding: "8px 12px"}}>+
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "12px",
                                        paddingTop: "4px"
                                    }}>
                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}>
                                            <div>
                                                <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Hallway
                                                    & Landing Included</p>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: "0.7rem",
                                                    color: "var(--text-muted)"
                                                }}>Entrance halls, stairs, floor landings</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={editHallway}
                                                onChange={(e) => setEditHallway(e.target.checked)}
                                                style={{width: "18px", height: "18px"}}
                                            />
                                        </div>

                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}>
                                            <div>
                                                <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Study /
                                                    Office Included</p>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: "0.7rem",
                                                    color: "var(--text-muted)"
                                                }}>Home office or dedicated library space</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={editStudy}
                                                onChange={(e) => setEditStudy(e.target.checked)}
                                                style={{width: "18px", height: "18px"}}
                                            />
                                        </div>

                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}>
                                            <div>
                                                <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Utility
                                                    / Laundry Room Included</p>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: "0.7rem",
                                                    color: "var(--text-muted)"
                                                }}>Dedicated washing and utility space</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={editUtility}
                                                onChange={(e) => setEditUtility(e.target.checked)}
                                                style={{width: "18px", height: "18px"}}
                                            />
                                        </div>

                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}>
                                            <div>
                                                <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Guest WC
                                                    Included</p>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: "0.7rem",
                                                    color: "var(--text-muted)"
                                                }}>Downstairs toilet/washroom</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={editGuestWc}
                                                onChange={(e) => setEditGuestWc(e.target.checked)}
                                                style={{width: "18px", height: "18px"}}
                                            />
                                        </div>

                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}>
                                            <div>
                                                <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>HP /
                                                    Storage Closets Included</p>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: "0.7rem",
                                                    color: "var(--text-muted)"
                                                }}>Hot press, linen closet, built-in storage</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={editStorage}
                                                onChange={(e) => setEditStorage(e.target.checked)}
                                                style={{width: "18px", height: "18px"}}
                                            />
                                        </div>

                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}>
                                            <div>
                                                <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Outdoor
                                                    Area Included</p>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: "0.7rem",
                                                    color: "var(--text-muted)"
                                                }}>Garden, patio, driveway</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={editOutdoor}
                                                onChange={(e) => setEditOutdoor(e.target.checked)}
                                                style={{width: "18px", height: "18px"}}
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div style={{
                                padding: "16px 24px",
                                borderTop: "1px solid var(--panel-border)",
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "12px"
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditOpen(false)}
                                    className="sheet-select"
                                    style={{padding: "10px 20px"}}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: "0 24px", backgroundColor: "var(--primary)", border: "none",
                                        borderRadius: "8px", color: "white", fontWeight: "bold", cursor: "pointer",
                                        height: "38px"
                                    }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                        <span>{t.msg}</span>
                    </div>
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmDialog?.open && (
                <div className="confirm-overlay" onClick={() => setConfirmDialog(null)}>
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <h4>{confirmDialog.title}</h4>
                        <p>{confirmDialog.message}</p>
                        <div className="confirm-dialog-actions">
                            <button className="confirm-btn-cancel" onClick={() => setConfirmDialog(null)}>Cancel
                            </button>
                            <button className="confirm-btn-danger" onClick={() => {
                                confirmDialog.onConfirm();
                                setConfirmDialog(null);
                            }}>Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
