'use client';

import {useEffect, useState} from "react";
import {type Property} from "@/types";
import {apiGet} from "@/lib/api";
import PropertyGrid from "@/components/frontend/PropertyGrid";
import {SlidersHorizontal} from "lucide-react";

const PropertyClient = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    // Property Filter state
    const [showPropFilters, setShowPropFilters] = useState(false);
    const [filterCountry, setFilterCountry] = useState('');
    const [filterProvince, setFilterProvince] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [filterKeyword, setFilterKeyword] = useState('');
    const [filterBedrooms, setFilterBedrooms] = useState('');
    const [filterBathrooms, setFilterBathrooms] = useState('');
    const [filterKitchen, setFilterKitchen] = useState('');
    const [filterHallway, setFilterHallway] = useState('');
    const [filterTime, setFilterTime] = useState('');

    const resetPropFilters = () => {
        setFilterCountry('');
        setFilterProvince('');
        setFilterCity('');
        setFilterKeyword('');
        setFilterBedrooms('');
        setFilterBathrooms('');
        setFilterKitchen('');
        setFilterHallway('');
        setFilterTime('');
    };

    const fetchProperties = async () => {
        try {
            const response = await apiGet(`/Inspection/properties`);
            setProperties([...response.data.items]);
        } catch (e) {

        }
    }

    useEffect(() => {
        fetchProperties();
    }, []);

    return (
        <section>
            {/* Section header with filter toggle */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
            }}>
                <h2 style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    letterSpacing: "-0.2px",
                    margin: 0
                }}>
                    All properties
                    <span style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontWeight: "normal",
                        marginLeft: "8px"
                    }}>({properties.length})</span>
                </h2>
                <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                    <button onClick={resetPropFilters} style={{
                        fontSize: "0.75rem",
                        color: "var(--danger)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px"
                    }}>
                        Clear filters
                    </button>
                    <button
                        onClick={() => setShowPropFilters(f => !f)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 14px",
                            borderRadius: "10px",
                            border: "1px solid var(--panel-border)",
                            background: showPropFilters ? "var(--primary-bg)" : "transparent",
                            color: showPropFilters ? "var(--primary)" : "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "600",
                            position: "relative"
                        }}
                    >
                        <SlidersHorizontal size={15}/>
                        Filters
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showPropFilters && (
                <div className="glass-panel" style={{
                    padding: "18px 20px",
                    marginBottom: "20px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "14px"
                }}>
                    {/* Country */}
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                        <label style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>Country</label>
                        <select className="sheet-select"
                                style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                value={filterCountry}
                                onChange={e => setFilterCountry(e.target.value)}>
                            <option value="">All</option>
                            <option value="ireland">Ireland 🇮🇪</option>
                            <option value="northern_ireland">Northern Ireland 🇬🇧</option>
                        </select>
                    </div>

                    {/* Province */}
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                        <label style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>Province</label>
                        <input className="sheet-input"
                               style={{fontSize: "0.8rem", padding: "7px 10px"}}
                               placeholder="e.g. Ulster" value={filterProvince}
                               onChange={e => setFilterProvince(e.target.value)}/>
                    </div>

                    {/* City */}
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                        <label style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>City</label>
                        <input className="sheet-input"
                               style={{fontSize: "0.8rem", padding: "7px 10px"}}
                               placeholder="e.g. Belfast" value={filterCity}
                               onChange={e => setFilterCity(e.target.value)}/>
                    </div>

                    {/* Keyword */}
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                        <label style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>Keyword</label>
                        <input className="sheet-input"
                               style={{fontSize: "0.8rem", padding: "7px 10px"}}
                               placeholder="Address, type..." value={filterKeyword}
                               onChange={e => setFilterKeyword(e.target.value)}/>
                    </div>

                    {/* Bedrooms */}
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                        <label style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>🛏 Bedrooms</label>
                        <select className="sheet-select"
                                style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                value={filterBedrooms}
                                onChange={e => setFilterBedrooms(e.target.value)}>
                            <option value="">Any</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4+">4+</option>
                        </select>
                    </div>

                    {/* Bathrooms */}
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                        <label style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>🛁 Bathrooms</label>
                        <select className="sheet-select"
                                style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                value={filterBathrooms}
                                onChange={e => setFilterBathrooms(e.target.value)}>
                            <option value="">Any</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3+">3+</option>
                        </select>
                    </div>

                    {/* Kitchen */}
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                        <label style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>🍳 Kitchen</label>
                        <select className="sheet-select"
                                style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                value={filterKitchen}
                                onChange={e => setFilterKitchen(e.target.value)}>
                            <option value="">Any</option>
                            <option value="Kitchen">Standard</option>
                            <option value="Kitchen/Living">Kitchen/Living</option>
                        </select>
                    </div>

                    {/* Hallway / Living Room */}
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                        <label style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>🚪 Hallway</label>
                        <select className="sheet-select"
                                style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                value={filterHallway}
                                onChange={e => setFilterHallway(e.target.value)}>
                            <option value="">Any</option>
                            <option value="yes">Included</option>
                            <option value="no">Not Included</option>
                        </select>
                    </div>

                    {/* Entry time */}
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                        <label style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>📅 Added</label>
                        <select className="sheet-select"
                                style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                value={filterTime} onChange={e => setFilterTime(e.target.value)}>
                            <option value="">Any time</option>
                            <option value="week">Last 7 days</option>
                            <option value="month">Last 30 days</option>
                            <option value="quarter">Last 3 months</option>
                            <option value="year">Last year</option>
                        </select>
                    </div>
                </div>
            )}

            {properties.length === 0 && (
                <div className="glass-panel" style={{
                    padding: "40px",
                    textAlign: "center",
                    borderStyle: "dashed",
                    marginBottom: "20px"
                }}>
                    <p style={{color: "var(--text-muted)", margin: 0}}>No properties match the current filters.</p>
                    <button onClick={resetPropFilters} style={{
                        marginTop: "10px",
                        color: "var(--primary)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.85rem"
                    }}>Clear filters
                    </button>
                </div>
            )}

            <PropertyGrid properties={properties} onDelete={fetchProperties}/>
        </section>
    );
};

export default PropertyClient;