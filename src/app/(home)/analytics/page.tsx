'use client';

import {Plus, RefreshCcw, Search, Sparkles} from "lucide-react";

export default function Page() {
    return (
        <>
            <header className="dashboard-header">
                <div>
                    <h1 style={{fontSize: "1.75rem", fontWeight: "900", letterSpacing: "-0.5px"}}>
                        Analytics & Trends
                    </h1>
                    <p style={{fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "2px"}}>
                        Property Defects & Quality Insights
                    </p>
                </div>
            </header>
            <div className="glass-panel" style={{padding: "40px", textAlign: "center"}}>
                <Sparkles size={48} color="var(--primary)" style={{margin: "0 auto 16px auto", opacity: 0.8}}/>
                <h3 style={{margin: 0, fontSize: "1.25rem", fontWeight: "bold"}}>Defects Analytics Engine</h3>
                <p style={{
                    color: "var(--text-muted)",
                    marginTop: "8px",
                    maxWidth: "450px",
                    marginInline: "auto"
                }}>
                    Integrates full room defect tracking, historical condition charts, and item lifetimes.
                    Available inside inspection reports.
                </p>
            </div>
        </>
    )
}