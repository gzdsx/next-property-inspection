'use client';

import Link from "next/link";
import {Trash2} from "lucide-react";
import {type Property} from "@/types";
import {useConfirm, useSpinner} from "@/contexts/AppContext";
import {apiDelete} from "@/lib/api";

interface PropertyCardProps {
    property: Property;
    onDelete?: (property: Property) => void;
}

const PropertyCard = ({property, onDelete}: PropertyCardProps) => {
    const confirm = useConfirm();
    const spinner = useSpinner();
    const handleDeleteProperty = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        confirm.open({
            title: "Delete Property",
            message: "Are you sure you want to delete this property?",
            onConfirm: () => {
                spinner.show();
                apiDelete(`/properties/${property.id}`).then(response => {
                    onDelete?.(property);
                }).catch(reason => {

                }).finally(() => {
                    spinner.hide();
                })
            }
        });
    }
    return (
        <div className="glass-panel glass-panel-hover property-card">
            <div className="property-image-wrapper" style={{height: "160px"}}>
                <Link href={`/property/${property.id}`}>
                    <img
                        src={property.image}
                        alt={property.name}
                        className="property-image"
                        onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80";
                        }}
                    />
                </Link>
                <div className="absolute top-3 left-3">
                    <span className="badge text-white">{property.type || "HMO Property"}</span>
                </div>
            </div>
            <div className="property-card-content" style={{padding: "16px"}}>
                <div>
                    <h3 style={{margin: 0, fontSize: "1rem", fontWeight: "bold"}}
                        className="truncate">
                        {property.name}
                    </h3>
                    <p style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginTop: "4px"
                    }}>
                        {property.type}
                    </p>
                </div>

                <div style={{
                    display: "flex",
                    gap: "12px",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)"
                }}>
                    <span>🛏️ {property.bedrooms} Bedrooms</span>
                    <span>🛁 {property.main_bathrooms} Bathrooms</span>
                </div>

                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--panel-border)",
                    paddingTop: "12px",
                    marginTop: "12px"
                }}>
                    <div>
                        <span style={{
                            fontSize: "0.75rem",
                            color: "var(--text-dark)",
                            fontWeight: "500"
                        }}>{property.views} visits</span>
                        <span style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            marginLeft: "8px"
                        }}>{property.last_updated_at}</span>
                    </div>
                    <button
                        onClick={handleDeleteProperty}
                        title="Delete property"
                        style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: "var(--danger-bg)",
                            color: "var(--danger)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0
                        }}
                    >
                        <Trash2 size={13} style={{margin: "auto"}}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;