"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, Sparkles, Clock, Play, Video, Search, Filter, Eye 
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

const ELEMENT_KEYWORDS = [
  "door", "flooring", "wall", "ceiling", "window", "baseboard", "skirting", 
  "radiator", "heating", "stair", "lighting", "socket", "switch", "sink", "tap"
];

export default function SharedRoomDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const roomName = decodeURIComponent(params.roomName as string);

  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Data States
  const [roomRecords, setRoomRecords] = useState<DefectRecord[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");

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
        
        // Filter room-specific items
        const filtered = data.filter(r => (r.room_name || "").toLowerCase() === roomName.toLowerCase());
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

  // Seek video player
  const handleSeek = (seconds: number | undefined) => {
    if (seconds === undefined) return;
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  // Split into Elements vs Inventory
  const isElement = (itemName: string) => {
    const name = itemName.toLowerCase();
    return ELEMENT_KEYWORDS.some(keyword => name.includes(keyword));
  };

  const elements = roomRecords.filter(r => isElement(r.item_name));
  const inventory = roomRecords.filter(r => !isElement(r.item_name));

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
          <p>The requested room data is missing.</p>
          <Link href={`/shared/${id}`} className="sheet-select" style={{ display: "inline-block", marginTop: "20px", textDecoration: "none" }}>Back to overview</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" style={{ paddingLeft: 0 }}>
      {/* ── MAIN ROOM VIEWPORT ────────────────────────────────────────────── */}
      <div className="main-viewport" style={{ padding: "24px", overflowY: "auto" }}>
        
        {/* Header Block */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <Link href={`/shared/${id}`} style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "4px" }}>
              <ChevronLeft size={16} />
              Back to Overview
            </Link>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", display: "flex", alignItems: "center", gap: "8px" }}>
              🏠 {roomName}
            </h1>
          </div>

          <div>
            <span className="badge badge-primary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}>
              <Eye size={14} /> Shared view (read only)
            </span>
          </div>
        </header>

        {/* Dynamic Inner Columns split */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px", alignItems: "flex-start" }}>
          
          {/* Left Column: Player & issue timestamps */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            <div className="glass-panel" style={{ padding: "16px" }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Video size={14} /> AI Captured Timestamps Evidence
              </h3>
              
              <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px" }}>
                {roomRecords.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSeek(item.elapsedSeconds)}
                    className="glass-panel glass-panel-hover"
                    style={{ 
                      padding: "10px 14px", cursor: "pointer", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: "4px", minWidth: "84px", flexShrink: 0
                    }}
                  >
                    <Clock size={16} className="text-muted" />
                    <span style={{ fontSize: "0.75rem", fontWeight: "bold", fontFamily: "monospace" }}>
                      {formatTime(item.elapsedSeconds || 0)}
                    </span>
                    <span style={{ fontSize: "0.6rem", color: "var(--text-dark)", textAlign: "center" }} className="truncate w-14">
                      {item.item_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Elements & Inventory Spreadsheets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Table Filters header */}
            <div className="glass-panel" style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
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
                  <option value="good">Good / New</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor / Damaged</option>
                </select>
              </div>
            </div>

            {/* Elements Table (Structural) */}
            <div className="glass-panel" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--panel-border)" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "bold" }}>Elements (Building & Hard Features)</h3>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th className="sheet-th" style={{ width: "120px" }}>Item</th>
                      <th className="sheet-th" style={{ width: "90px" }}>Timestamp</th>
                      <th className="sheet-th" style={{ width: "100px" }}>Condition</th>
                      <th className="sheet-th">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredElements.map((item) => (
                      <tr key={item.id} className="sheet-tr">
                        <td className="sheet-td">
                          <span style={{ fontWeight: "bold" }}>{item.item_name}</span>
                        </td>
                        <td className="sheet-td">
                          <button 
                            onClick={() => handleSeek(item.elapsedSeconds)}
                            className="badge badge-primary" 
                            style={{ fontFamily: "monospace", cursor: "pointer", border: "none", display: "inline-flex", gap: "4px" }}
                          >
                            <Play size={10} />
                            {formatTime(item.elapsedSeconds || 0)}
                          </button>
                        </td>
                        <td className="sheet-td">
                          <span className={`badge ${
                            item.condition.toLowerCase().includes("good") ? "badge-success" :
                            item.condition.toLowerCase().includes("new") ? "badge-primary" :
                            item.condition.toLowerCase().includes("fair") ? "badge-warning" : "badge-danger"
                          }`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="sheet-td">
                          <span style={{ color: "var(--text-muted)" }}>{item.description || "N/A"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Table (Loose / Fittings) */}
            <div className="glass-panel" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--panel-border)" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "bold" }}>Inventory & Safety (Furnishings / Appliances)</h3>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="sheet-table">
                  <thead>
                    <tr>
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
                        <td className="sheet-td">
                          <span style={{ fontWeight: "bold" }}>{item.item_name}</span>
                        </td>
                        <td className="sheet-td">
                          <span>{item.qty || 1}</span>
                        </td>
                        <td className="sheet-td">
                          <button 
                            onClick={() => handleSeek(item.elapsedSeconds)}
                            className="badge badge-primary" 
                            style={{ fontFamily: "monospace", cursor: "pointer", border: "none", display: "inline-flex", gap: "4px" }}
                          >
                            <Play size={10} />
                            {formatTime(item.elapsedSeconds || 0)}
                          </button>
                        </td>
                        <td className="sheet-td">
                          <span className={`badge ${
                            item.condition.toLowerCase().includes("good") ? "badge-success" :
                            item.condition.toLowerCase().includes("new") ? "badge-primary" :
                            item.condition.toLowerCase().includes("fair") ? "badge-warning" : "badge-danger"
                          }`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="sheet-td">
                          <span style={{ color: "var(--text-muted)" }}>{item.description || "N/A"}</span>
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
