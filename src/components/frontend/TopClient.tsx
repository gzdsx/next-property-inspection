import {RefreshCcw, Search} from "lucide-react";

export const TopClient = () => {
    return (
        <header className="dashboard-header">
            <div>
                <h1 style={{fontSize: "1.75rem", fontWeight: "900", letterSpacing: "-0.5px"}}>
                    {activeTab === "home" ? "Video Inspections" : "Analytics & Trends"}
                </h1>
                <p style={{fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "2px"}}>
                    {activeTab === "home" ? "AI Multimodal Property Verification" : "Property Defects & Quality Insights"}
                </p>
            </div>

            <div style={{
                display: "flex",
                gap: "12px",
                width: "100%",
                maxWidth: "600px",
                justifyContent: "flex-end"
            }}>
                {/* Search Bar */}
                <div className="search-container">
                    <Search size={18} className="search-icon"/>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search properties, visits, rooms..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>

                <button className="glass-panel rounded-full w-10 h-10">
                    <RefreshCcw size={18} style={{margin: "auto"}}/>
                </button>

                <button
                    onClick={() => setIsAddPropertyOpen(true)}
                    className={'flex items-center gap-2 bg-blue-600 rounded-sm px-4'}
                >
                    <Plus size={18}/>
                    <span className={'text-sm text-nowrap'}>Add Property</span>
                </button>
            </div>
        </header>
    );
};