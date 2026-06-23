'use client';

import Link from "next/link";
import dayjs from "dayjs";
import {ChevronRight, Link2, Trash2} from "lucide-react";
import {useRouter} from "next/navigation";

interface ReportCardProps {
    report: any,
    onDelete?: (report: any) => void
}

const ReportCard = ({report, onDelete}: ReportCardProps) => {
    const router = useRouter();
    const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onDelete?.(report);
    }

    return (
        <div className={'glass-panel glass-panel-hover property-card'}>
            <div className="property-image-wrapper aspect-4/3!">
                <Link href={`/report/${report.id}`}>
                    <img
                        src={report.image ? report.image : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80"}
                        alt="Property Cover"
                        className="property-image aspect-4/3!"
                        onError={(e) => {
                            // Standard fallback image if thumb fails
                            e.currentTarget.src = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80";
                        }}
                    />
                </Link>
                <div className="absolute top-3 left-3"
                     style={{display: "flex", gap: "6px"}}>
                    <span
                        className={`capitalize badge ${report.isSigned ? "badge-success" : "badge-warning"}`}>{report.status}</span>
                    <span className={`badge ${report.isSigned ? "badge-success" : "badge-danger"}`}>
                        {report.signature ? "✍️ Signed" : "⏳ Unsigned"}
                    </span>
                </div>
                {report.isOfflineVideo && (
                    <div className="absolute top-3 right-3">
                        <span className="badge badge-primary">Offline Walkthrough</span>
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
                        {report.property?.name}
                    </h3>
                    <p className={'text-sm text-gray-500 mt-1'}>
                        {report.user ? `By ${report.user.name}` : "AI Automated Inspection"}
                    </p>
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
                              {dayjs(report.created_at).format("MMM D, YYYY")}
                            </span>
                    <div style={{display: "flex", gap: "8px"}}>
                        <button
                            onClick={handleDelete}
                            title="Delete report"
                            className={'text-3xl size-8 rounded-md bg-red-200/10 aspect-square text-red-500 flex justify-center items-center cursor-pointer'}
                        >
                            <Trash2 size={14} style={{margin: "auto"}}/>
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/report/${report.id}/edit`)
                            }}
                            title="Add to Property as Historical Visit"
                            className={'text-3xl size-8 rounded-md bg-red-200/10 aspect-square text-gray-300 flex justify-center items-center cursor-pointer'}
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
        </div>
    );
};

export default ReportCard;