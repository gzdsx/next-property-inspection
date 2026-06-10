'use client';

const ReportClient = () => {
    return (
        <section style={{marginBottom: "40px"}}>
            <h2 style={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                marginBottom: "16px",
                letterSpacing: "-0.2px"
            }}>
                Recent inspections
            </h2>

            {isLoading ? (
                <div style={{textAlign: "center", padding: "60px", color: "var(--text-muted)"}}>
                    Loading reports...
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="glass-panel"
                     style={{padding: "60px", textAlign: "center", borderStyle: "dashed"}}>
                    <p style={{color: "var(--text-muted)"}}>No recent inspections match your
                        search.</p>
                </div>
            ) : (
                <div className="property-grid">
                    {filteredReports.map((report) => (
                        <Link
                            href={`/report/${report.id}`}
                            key={report.id}
                            className="glass-panel glass-panel-hover property-card"
                            style={{textDecoration: "none", color: "inherit"}}
                        >
                            <div className="property-image-wrapper">
                                <img
                                    src={report.coverPhoto ? `/uploads/${report.coverPhoto}` : `/uploads/${report.id}_cover.jpg`}
                                    alt="Property Cover"
                                    className="property-image"
                                    onError={(e) => {
                                        // Standard fallback image if thumb fails
                                        e.currentTarget.src = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80";
                                    }}
                                />
                                <div className="absolute top-3 left-3"
                                     style={{display: "flex", gap: "6px"}}>
                            <span className={`badge ${report.isSigned ? "badge-success" : "badge-warning"}`}>
                              {report.isSigned ? "Completed" : "Draft"}
                            </span>
                                    <span
                                        className={`badge ${report.isSigned ? "badge-success" : "badge-danger"}`}>
                              {report.isSigned ? "✍️ Signed" : "⏳ Unsigned"}
                            </span>
                                </div>
                                {report.isOfflineVideo && (
                                    <div className="absolute top-3 right-3">
                                                            <span
                                                                className="badge badge-primary">Offline Walkthrough</span>
                                    </div>
                                )}
                            </div>
                            <div className="property-card-content">
                                <div>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: "1.1rem",
                                        fontWeight: "bold",
                                        lineHeight: "1.3"
                                    }} className="truncate">
                                        {report.address || `Property #${report.id.substring(report.id.length - 4)}`}
                                    </h3>
                                    <p style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "4px"
                                    }}>
                                        {report.inspectorName ? `By ${report.inspectorName}` : "AI Automated Inspection"}
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
                                Report ID: #{report.id}
                              </span>
                                    </div>
                                </div>

                                <div className="room-badge-row">
                                    {report.conditionStats && (
                                        <>
                                            {report.conditionStats.poor > 0 && (
                                                <span className="room-badge room-badge-poor">
                                    {report.conditionStats.poor} Poor
                                  </span>
                                            )}
                                            {report.conditionStats.fair > 0 && (
                                                <span className="room-badge room-badge-fair">
                                    {report.conditionStats.fair} Fair
                                  </span>
                                            )}
                                            {report.conditionStats.good > 0 && (
                                                <span className="room-badge room-badge-good">
                                    {report.conditionStats.good} Good
                                  </span>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderTop: "1px solid var(--panel-border)",
                                    paddingTop: "12px",
                                    marginTop: "12px"
                                }}>
                            <span style={{fontSize: "0.75rem", color: "var(--text-dark)", fontWeight: "bold"}}>
                              {formatDate(report.createdAt)}
                            </span>
                                    <div style={{display: "flex", gap: "8px"}}>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDelete(e, report.id);
                                            }}
                                            title="Delete report"
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
                                            <Trash2 size={14} style={{margin: "auto"}}/>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setLinkingReport(report);
                                                setSelectedPropId('');
                                            }}
                                            title="Add to Property as Historical Visit"
                                            style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "8px",
                                                border: "none",
                                                backgroundColor: "var(--primary-bg)",
                                                color: "var(--primary)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer"
                                            }}
                                        >
                                            <Link2 size={14} style={{margin: "auto"}}/>
                                        </button>
                                        <div style={{
                                            color: "var(--primary)",
                                            display: "flex",
                                            alignItems: "center"
                                        }}>
                                            <ChevronRight size={20}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
};

export default ReportClient;