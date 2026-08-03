"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Layers, Sparkles, AlertTriangle, Check, Play, Eye, Home, BarChart3, MapPin
} from 'lucide-react';

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

export default function SharedReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [records, setRecords] = useState<DefectRecord[]>([]);
  const [segments, setSegments] = useState<RoomSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [meta, setMeta] = useState<{
    address: string;
    inspectorName: string;
    companyName?: string;
    phone?: string;
    email?: string;
    reference?: string;
    coverPhotoBase64?: string;
  } | null>(null);

  // Fetch report data
  useEffect(() => {
    if (!id) return;

    const fetchReport = async () => {
      try {
        const res = await fetch(`/uploads/${id}.json`);
        if (!res.ok) throw new Error("Report data not found on server.");
        const data = await res.json();
        setRecords(data);
        
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

    fetchReport();
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
      if (cond.includes("good")) rate = "good";
      else if (cond.includes("fair") || cond.includes("mark")) rate = "fair";
      else rate = "poor";

      if (!roomMap[room]) {
        roomMap[room] = { start: seconds, end: seconds + 5, good: 0, fair: 0, poor: 0 };
      }
      
      roomMap[room].start = Math.min(roomMap[room].start, seconds);
      roomMap[room].end = Math.max(roomMap[room].end, seconds + 5);
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
      videoRef.current.play().catch(() => {});
      setActiveSegmentIndex(idx);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="dashboard-layout" style={{ justifyContent: "center", alignItems: "center" }}>
        <h2 style={{ color: "var(--text-muted)" }}>Loading Shared Video Report...</h2>
      </div>
    );
  }

  if (error || !videoUrl || records.length === 0) {
    return (
      <div className="dashboard-layout" style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "20px" }}>
        <div className="glass-panel" style={{ padding: "50px", textAlign: "center", border: "1px solid var(--danger)" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "10px", color: "var(--danger)" }}>❌ Report Not Found</h1>
          <p style={{ color: "var(--text-muted)" }}>The requested shared inspection report does not exist or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" style={{ paddingLeft: 0 }}>
      {/* ── MAIN REPORT CONTENT ────────────────────────────────────────────── */}
      <div className="main-viewport flex-col md:flex-row!">
        
        {/* Left Half: Continuous Video Timeline Player */}
        <section className="shared-left" style={{ flex: 1.5, display: "flex", flexDirection: "column", padding: "24px", overflowY: "auto", borderRight: "1px solid var(--panel-border)" }}>
          {/* Shared Read-only Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="sidebar-logo" style={{ width: "36px", height: "36px", borderRadius: "8px", margin: 0 }}>
                <Sparkles size={18} />
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "bold" }}>Amnis Shared View</h2>
            </div>
            
            <div>
              <span className="badge badge-primary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}>
                <Eye size={14} /> Shared view (read only)
              </span>
            </div>
          </div>

          {/* Property Address */}
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "900", display: "flex", alignItems: "center", gap: "8px", color: "var(--foreground)", letterSpacing: "-0.3px" }}>
              <MapPin size={20} style={{ color: "var(--primary)" }} />
              {meta?.address || "Walkthrough Inspection Report"}
            </h2>
          </div>

          {/* Continuous Walkthrough Video Player */}
          <div className="glass-panel" style={{ overflow: "hidden", position: "relative", background: "black", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <video 
              ref={videoRef}
              style={{ width: "100%", maxHeight: "420px", display: "block" }}
              controls 
              preload="auto"
              src={videoUrl}
            />
          </div>

          {/* Multi-Colored Horizontal Segmented Timeline Track */}
          <div className="timeline-track-container" style={{ marginTop: "20px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={14} /> Walkthrough Room Segments Timeline
            </span>

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
          </div>
        </section>

        {/* Right Half: Room grid cards indicator list */}
        <section className="shared-right" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px", overflowY: "auto", background: "rgba(10, 15, 26, 0.15)" }}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "900", letterSpacing: "-0.4px" }}>
              {meta?.address || "Shared Property Inspection"}
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Completed by {meta?.inspectorName || "AI Inspector"} · Reference No. {meta?.reference || id}
            </p>
          </div>

          {/* Rooms Card Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", flex: 1, alignContent: "flex-start", paddingBottom: "20px" }}>
            {segments.map((seg, idx) => (
              <div 
                key={idx}
                onClick={() => router.push(`/shared/${id}/room/${encodeURIComponent(seg.name)}`)}
                className="glass-panel glass-panel-hover"
                style={{ 
                  padding: "16px", cursor: "pointer", borderLeft: `4px solid ${seg.color}`,
                  display: "flex", flexDirection: "column", justifyContent: "space-between", height: "136px"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "bold" }}>{seg.name}</h3>
                    <span className="badge badge-success" style={{ fontSize: "0.6rem" }}>Completed</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Chapter: {formatTime(seg.start)} - {formatTime(seg.end)}
                  </p>
                </div>

                <div className="room-badge-row" style={{ marginTop: "12px" }}>
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
          <div style={{ borderTop: "1px solid var(--panel-border)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <span>Secure Shared Dashboard Overview</span>
              <span style={{ fontWeight: "bold", color: "var(--success)" }}>Verified and Logged</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
