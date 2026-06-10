"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, Sparkles, Edit2, Check, Plus, Trash2, Clock, Play, Video, Search, Filter, Undo
} from "lucide-react";

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
  qty?: number;
}

// Elements list (structural hard-installed items)
const ELEMENT_KEYWORDS = [
  "door", "flooring", "wall", "ceiling", "window", "baseboard", "skirting", 
  "radiator", "heating", "stair", "lighting", "socket", "switch", "sink", "tap"
];

const getConditionBadgeStyle = (condition: string) => {
  const cond = (condition || "").toLowerCase().trim();
  if (cond.includes("very poor")) {
    return {
      backgroundColor: "rgba(127, 29, 29, 0.25)",
      color: "#f87171",
      border: "1px solid rgba(127, 29, 29, 0.4)",
      padding: "3px 10px",
      borderRadius: "8px",
      fontSize: "0.75rem",
      fontWeight: "bold" as const,
      display: "inline-block"
    };
  }
  if (cond.includes("poor")) {
    return {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      color: "#ef4444",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      padding: "3px 10px",
      borderRadius: "8px",
      fontSize: "0.75rem",
      fontWeight: "bold" as const,
      display: "inline-block"
    };
  }
  if (cond.includes("fair")) {
    return {
      backgroundColor: "rgba(245, 158, 11, 0.15)",
      color: "#f59e0b",
      border: "1px solid rgba(245, 158, 11, 0.3)",
      padding: "3px 10px",
      borderRadius: "8px",
      fontSize: "0.75rem",
      fontWeight: "bold" as const,
      display: "inline-block"
    };
  }
  if (cond.includes("good")) {
    return {
      backgroundColor: "rgba(59, 130, 246, 0.15)",
      color: "#3b82f6",
      border: "1px solid rgba(59, 130, 246, 0.3)",
      padding: "3px 10px",
      borderRadius: "8px",
      fontSize: "0.75rem",
      fontWeight: "bold" as const,
      display: "inline-block"
    };
  }
  if (cond.includes("new")) {
    return {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      color: "#10b981",
      border: "1px solid rgba(16, 185, 129, 0.3)",
      padding: "3px 10px",
      borderRadius: "8px",
      fontSize: "0.75rem",
      fontWeight: "bold" as const,
      display: "inline-block"
    };
  }
  return {
    backgroundColor: "rgba(156, 163, 175, 0.15)",
    color: "#9ca3af",
    border: "1px solid rgba(156, 163, 175, 0.3)",
    padding: "3px 10px",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: "bold" as const,
    display: "inline-block"
  };
};

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const roomName = decodeURIComponent(params.roomName as string);

  const videoRef = useRef<HTMLVideoElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeTimestampIdx, setActiveTimestampIdx] = useState<number | null>(null);
  
  // Data States
  const [allRecords, setAllRecords] = useState<DefectRecord[]>([]);
  const [roomRecords, setRoomRecords] = useState<DefectRecord[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");

  // Editing UI States
  const [isEditing, setIsEditing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Undo History State System
  const [historyStack, setHistoryStack] = useState<DefectRecord[][]>([]);

  const saveHistoryState = () => {
    // Only save up to 50 states to prevent memory issues
    setHistoryStack(prev => {
      const next = [...prev, roomRecords];
      if (next.length > 50) return next.slice(next.length - 50);
      return next;
    });
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previousState = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, -1));
    setRoomRecords(previousState);
    triggerToast("Undone last action (已撤销上一步操作)");
  };

  // Reset history stack upon entering/leaving edit mode
  useEffect(() => {
    setHistoryStack([]);
  }, [isEditing]);

  const [meta, setMeta] = useState<{
    address: string;
    inspectorName: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRoomData = async () => {
      try {
        const res = await fetch(`/uploads/${id}.json`);
        if (!res.ok) throw new Error("Inspection data not found.");
        const data: DefectRecord[] = await res.json();
        
        // Ensure every record has a unique ID to prevent React "missing unique key" console warnings
        const dataWithIds = data.map((r, idx) => ({
          ...r,
          id: r.id || `item_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`
        }));
        
        setAllRecords(dataWithIds);
        
        // Filter room-specific items
        const filtered = dataWithIds.filter(r => (r.room_name || "").toLowerCase() === roomName.toLowerCase());
        setRoomRecords(filtered);
        
        // Dynamically check if .mp4 exists, fallback to .webm
        let resolvedVideoUrl = `/uploads/${id}.webm`;
        try {
          const mp4Check = await fetch(`/uploads/${id}.mp4`, { method: "HEAD" });
          if (mp4Check.ok) {
            resolvedVideoUrl = `/uploads/${id}.mp4`;
          }
        } catch (e) {}
        setVideoUrl(resolvedVideoUrl);

        try {
          const metaRes = await fetch(`/uploads/${id}_meta.json`);
          if (metaRes.ok) {
            setMeta(await metaRes.json());
          }
        } catch (e) {}
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
  }, [id, roomName]);

  // Toast helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  // Seek video player and highlight the active timestamp card
  const handleSeek = (seconds: number | undefined, idx: number) => {
    if (seconds === undefined) return;
    setActiveTimestampIdx(idx);
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
    // Auto-scroll active card to the horizontal centre of the carousel
    if (carouselRef.current) {
      const container = carouselRef.current;
      const card = container.children[idx] as HTMLElement | undefined;
      if (card) {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const targetScroll = cardCenter - container.clientWidth / 2;
        container.scrollTo({ left: targetScroll, behavior: "smooth" });
      }
    }
  };

  // Split into Elements vs Inventory
  const isElement = (itemName: string) => {
    const name = itemName.toLowerCase();
    return ELEMENT_KEYWORDS.some(keyword => name.includes(keyword));
  };

  const elements = roomRecords.filter(r => isElement(r.item_name));
  const inventory = roomRecords.filter(r => !isElement(r.item_name));

  // Handle Edit Input Changes
  const handleCellChange = (recordId: string, field: keyof DefectRecord, value: any) => {
    setRoomRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        return { ...rec, [field]: value };
      }
      return rec;
    }));
  };

  // Auto-acquire timestamp from active frame
  const handleAcquireTimestamp = (recordId: string) => {
    if (videoRef.current) {
      saveHistoryState();
      const curTime = videoRef.current.currentTime || 0;
      handleCellChange(recordId, "elapsedSeconds", Math.round(curTime * 1000) / 1000);
      triggerToast(`Timestamp associated: ${formatTime(curTime)}`);
    }
  };

  // Add a new row to room records
  const handleAddRow = (type: "element" | "inventory") => {
    saveHistoryState();
    const defaultName = type === "element" ? "Flooring" : "Personal Items";
    const newRecord: DefectRecord = {
      id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      room_name: roomName,
      item_name: defaultName,
      condition: "Good",
      description: "",
      elapsedSeconds: videoRef.current ? Math.round(videoRef.current.currentTime * 1000) / 1000 : 0,
      qty: 1
    };
    setRoomRecords(prev => [...prev, newRecord]);
  };

  // Delete a row
  const handleDeleteRow = (recordId: string) => {
    saveHistoryState();
    setRoomRecords(prev => prev.filter(rec => rec.id !== recordId));
  };

  // Save changes via PUT API
  const handleSaveAll = async () => {
    setIsLoading(true);
    try {
      // Re-merge updated room records back into the main property records array
      const otherRecords = allRecords.filter(r => (r.room_name || "").toLowerCase() !== roomName.toLowerCase());
      const updatedAll = [...otherRecords, ...roomRecords];

      const res = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedAll)
      });

      if (!res.ok) throw new Error("Failed to save updates to server.");
      
      setAllRecords(updatedAll);
      setIsEditing(false);
      triggerToast("Room edits saved successfully!");
    } catch (err: any) {
      alert(err.message || "Error saving edits.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Apply filters on lists
  const filterList = (list: DefectRecord[]) => {
    return list.filter(item => {
      const matchesSearch = 
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCondition = 
        conditionFilter === "all" || 
        item.condition.toLowerCase().includes(conditionFilter.toLowerCase());

      return matchesSearch && matchesCondition;
    });
  };

  const filteredElements = filterList(elements);
  const filteredInventory = filterList(inventory);

  if (isLoading) {
    return (
      <div className="dashboard-layout" style={{ justifyContent: "center", alignItems: "center" }}>
        <h2 style={{ color: "var(--text-muted)" }}>Loading room dashboard...</h2>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="dashboard-layout" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="glass-panel" style={{ padding: "50px", textAlign: "center", border: "1px solid var(--danger)" }}>
          <h1 style={{ color: "var(--danger)" }}>❌ Room Data Error</h1>
          <p>{error || "Walkthrough video or room data file is missing."}</p>
          <Link href={`/report/${id}`} className="sheet-select" style={{ display: "inline-block", marginTop: "20px", textDecoration: "none" }}>Back to report</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Toast Notification */}
      {showToast && (
        <div className="toast-success">
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── MAIN ROOM VIEWPORT ────────────────────────────────────────────── */}
      <div className="main-viewport" style={{ padding: "24px", overflowY: "auto" }}>
        
        {/* Header Block — sticky top bar */}
        <header style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px",
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(10,10,20,0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          margin: "-24px -24px 24px -24px", padding: "14px 24px",
          borderBottom: "1px solid var(--panel-border)"
        }}>
          <div>
            <Link href={`/report/${id}`} style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "4px" }}>
              <ChevronLeft size={16} />
              Back to {meta?.address || "Report Overview"}
            </Link>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", display: "flex", alignItems: "center", gap: "8px" }}>
              🏠 {roomName}
            </h1>
          </div>

          {/* Edit/Done Toggles with Undo option */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {isEditing && (
              <button
                onClick={handleUndo}
                disabled={historyStack.length === 0}
                className="glass-panel"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  backgroundColor: "var(--panel-bg)",
                  color: historyStack.length === 0 ? "var(--text-dark)" : "var(--foreground)",
                  border: "1px solid var(--panel-border)",
                  fontWeight: "bold",
                  cursor: historyStack.length === 0 ? "not-allowed" : "pointer",
                  borderRadius: "12px",
                  opacity: historyStack.length === 0 ? 0.4 : 1,
                  transition: "all 0.2s"
                }}
                title="Undo last change (撤销上一步)"
              >
                <Undo size={16} />
                <span>Undo (撤销)</span>
              </button>
            )}

            <button
              onClick={() => {
                if (isEditing) handleSaveAll();
                else setIsEditing(true);
              }}
              className="glass-panel"
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px",
                backgroundColor: isEditing ? "var(--primary-bg)" : "var(--panel-bg)",
                color: isEditing ? "var(--primary)" : "var(--foreground)",
                border: isEditing ? "1px solid var(--primary)" : "1px solid var(--panel-border)",
                fontWeight: "bold", cursor: "pointer", borderRadius: "12px"
              }}
            >
              {isEditing ? (
                <>
                  <Check size={16} />
                  Done
                </>
              ) : (
                <>
                  <Edit2 size={16} />
                  Edit Elements
                </>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Inner Columns split */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px", alignItems: "flex-start", minWidth: 0 }}>
          
          {/* Left Column: Player & issue timestamps — sticky sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, overflow: "hidden", position: "sticky", top: 80, alignSelf: "start" }}>
            <div className="glass-panel" style={{ overflow: "hidden", background: "black", borderRadius: "16px" }}>
              <video 
                ref={videoRef}
                style={{ width: "100%", maxHeight: "360px", display: "block" }}
                controls 
                preload="auto"
                src={videoUrl}
              />
            </div>

            {/* Thumbnail stamp timeline carousel */}
            <div className="glass-panel" style={{ padding: "16px", overflow: "hidden" }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Video size={14} /> AI Captured Timestamps Evidence
              </h3>
              
              <div ref={carouselRef} style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px", scrollbarWidth: "thin" }}>
                {roomRecords.map((item, idx) => {
                  const isActive = activeTimestampIdx === idx;
                  return (
                    <div 
                      key={item.id || idx}
                      onClick={() => handleSeek(item.elapsedSeconds, idx)}
                      className="glass-panel glass-panel-hover"
                      style={{ 
                        padding: "10px 14px", cursor: "pointer", display: "flex", flexDirection: "column",
                        alignItems: "center", gap: "4px", minWidth: "84px", flexShrink: 0,
                        transition: "background 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease",
                        background: isActive ? "rgba(99,102,241,0.22)" : undefined,
                        boxShadow: isActive ? "0 0 0 2px var(--primary), 0 4px 18px rgba(99,102,241,0.35)" : undefined,
                        transform: isActive ? "scale(1.06)" : "scale(1)",
                      }}
                    >
                      <Clock size={16} style={{ color: isActive ? "var(--primary)" : undefined }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", fontFamily: "monospace", color: isActive ? "var(--primary)" : undefined }}>
                        {formatTime(item.elapsedSeconds || 0)}
                      </span>
                      <span style={{ fontSize: "0.6rem", color: isActive ? "var(--primary)" : "var(--text-dark)", textAlign: "center" }} className="truncate w-14">
                        {item.item_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Elements & Inventory Spreadsheets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Table Filters header — sticky below main header */}
            <div className="glass-panel" style={{
              padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px",
              position: "sticky", top: 80, zIndex: 10,
              background: "rgba(18,18,35,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)"
            }}>
              <div className="search-container" style={{ maxWidth: "260px" }}>
                <Search size={14} className="search-icon" style={{ left: "10px" }} />
                <input 
                  type="text" 
                  className="search-input" 
                  style={{ padding: "8px 12px 8px 30px", fontSize: "0.8rem" }}
                  placeholder="Search notes..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Filter size={14} className="text-muted" />
                <select 
                  className="sheet-select" 
                  style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                >
                  <option value="all">All Conditions</option>
                  <option value="new">New Item</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="very poor">Very Poor</option>
                </select>
              </div>
            </div>

            {/* Elements Table (Structural) */}
            <div className="glass-panel" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--panel-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "bold" }}>Elements (Building & Hard Features)</h3>
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={() => handleAddRow("element")}
                    style={{ background: "transparent", border: "none", color: "var(--primary)", fontWeight: "bold", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={14} /> Add Element
                  </button>
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="sheet-table">
                  <thead>
                    <tr>
                      {isEditing && <th className="sheet-th" style={{ width: "40px" }} />}
                      <th className="sheet-th" style={{ width: "120px" }}>Item</th>
                      <th className="sheet-th" style={{ width: "90px" }}>Timestamp</th>
                      <th className="sheet-th" style={{ width: "100px" }}>Condition</th>
                      <th className="sheet-th">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredElements.map((item) => (
                      <tr key={item.id} className="sheet-tr">
                        {isEditing && (
                          <td className="sheet-td" style={{ textAlign: "center" }}>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteRow(item.id)}
                              style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                        <td className="sheet-td">
                          {isEditing ? (
                            <input 
                              type="text" 
                              className="sheet-input" 
                              value={item.item_name}
                              onFocus={saveHistoryState}
                              onChange={(e) => handleCellChange(item.id, "item_name", e.target.value)}
                            />
                          ) : (
                            <span style={{ fontWeight: "bold" }}>{item.item_name}</span>
                          )}
                        </td>
                        <td className="sheet-td">
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>{formatTime(item.elapsedSeconds || 0)}</span>
                              <button 
                                type="button" 
                                onClick={() => handleAcquireTimestamp(item.id)}
                                className="sheet-select" 
                                style={{ padding: "4px 6px" }}
                                title="Get active time"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleSeek(item.elapsedSeconds, roomRecords.findIndex(r => r.id === item.id))}
                              className="badge badge-primary" 
                              style={{ fontFamily: "monospace", cursor: "pointer", border: "none", display: "inline-flex", gap: "4px" }}
                            >
                              <Play size={10} />
                              {formatTime(item.elapsedSeconds || 0)}
                            </button>
                          )}
                        </td>
                        <td className="sheet-td">
                          {isEditing ? (
                            <select 
                              className="sheet-select"
                              value={item.condition}
                              onFocus={saveHistoryState}
                              onChange={(e) => handleCellChange(item.id, "condition", e.target.value)}
                            >
                              <option>New Item</option>
                              <option>Good</option>
                              <option>Fair</option>
                              <option>Poor</option>
                              <option>Very Poor</option>
                            </select>
                          ) : (
                            <span style={getConditionBadgeStyle(item.condition)}>
                              {item.condition}
                            </span>
                          )}
                        </td>
                        <td className="sheet-td">
                          {isEditing ? (
                            <input 
                              type="text" 
                              className="sheet-input" 
                              value={item.description || ""}
                              onFocus={saveHistoryState}
                              onChange={(e) => handleCellChange(item.id, "description", e.target.value)}
                            />
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>{item.description || "N/A"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Table (Loose / Fittings) */}
            <div className="glass-panel" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--panel-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "bold" }}>Inventory & Safety (Furnishings / Appliances)</h3>
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={() => handleAddRow("inventory")}
                    style={{ background: "transparent", border: "none", color: "var(--primary)", fontWeight: "bold", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={14} /> Add Item
                  </button>
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="sheet-table">
                  <thead>
                    <tr>
                      {isEditing && <th className="sheet-th" style={{ width: "40px" }} />}
                      <th className="sheet-th" style={{ width: "120px" }}>Item</th>
                      <th className="sheet-th" style={{ width: "50px" }}>QTY</th>
                      <th className="sheet-th" style={{ width: "90px" }}>Timestamp</th>
                      <th className="sheet-th" style={{ width: "100px" }}>Condition</th>
                      <th className="sheet-th">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="sheet-tr">
                        {isEditing && (
                          <td className="sheet-td" style={{ textAlign: "center" }}>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteRow(item.id)}
                              style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                        <td className="sheet-td">
                          {isEditing ? (
                            <input 
                              type="text" 
                              className="sheet-input" 
                              value={item.item_name}
                              onFocus={saveHistoryState}
                              onChange={(e) => handleCellChange(item.id, "item_name", e.target.value)}
                            />
                          ) : (
                            <span style={{ fontWeight: "bold" }}>{item.item_name}</span>
                          )}
                        </td>
                        <td className="sheet-td" style={{ textAlign: "center" }}>
                          {isEditing ? (
                            <input 
                              type="number" 
                              className="sheet-input" 
                              style={{ width: "50px", textAlign: "center" }}
                              value={item.qty || 1}
                              onFocus={saveHistoryState}
                              onChange={(e) => handleCellChange(item.id, "qty", parseInt(e.target.value) || 1)}
                            />
                          ) : (
                            <span>{item.qty || 1}</span>
                          )}
                        </td>
                        <td className="sheet-td">
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>{formatTime(item.elapsedSeconds || 0)}</span>
                              <button 
                                type="button" 
                                onClick={() => handleAcquireTimestamp(item.id)}
                                className="sheet-select" 
                                style={{ padding: "4px 6px" }}
                                title="Get active time"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleSeek(item.elapsedSeconds, roomRecords.findIndex(r => r.id === item.id))}
                              className="badge badge-primary" 
                              style={{ fontFamily: "monospace", cursor: "pointer", border: "none", display: "inline-flex", gap: "4px" }}
                            >
                              <Play size={10} />
                              {formatTime(item.elapsedSeconds || 0)}
                            </button>
                          )}
                        </td>
                        <td className="sheet-td">
                          {isEditing ? (
                            <select 
                              className="sheet-select"
                              value={item.condition}
                              onFocus={saveHistoryState}
                              onChange={(e) => handleCellChange(item.id, "condition", e.target.value)}
                            >
                              <option>New Item</option>
                              <option>Good</option>
                              <option>Fair</option>
                              <option>Poor</option>
                              <option>Very Poor</option>
                            </select>
                          ) : (
                            <span style={getConditionBadgeStyle(item.condition)}>
                              {item.condition}
                            </span>
                          )}
                        </td>
                        <td className="sheet-td">
                          {isEditing ? (
                            <input 
                              type="text" 
                              className="sheet-input" 
                              value={item.description || ""}
                              onFocus={saveHistoryState}
                              onChange={(e) => handleCellChange(item.id, "description", e.target.value)}
                            />
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>{item.description || "N/A"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
