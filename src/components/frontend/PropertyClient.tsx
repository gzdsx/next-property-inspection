'use client';

import {useEffect, useState} from "react";
import {apiGet} from "@/lib/api";
import PropertyGrid from "@/components/frontend/PropertyGrid";
import {SlidersHorizontal} from "lucide-react";
import {useQuery} from "@tanstack/react-query";

const PropertyClient = () => {
    const [properties, setProperties] = useState([]);
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
    const [loading, setLoading] = useState(false);

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

    const {data: serverData, isLoading, refetch} = useQuery({
        queryKey: ['properties', 'home'],
        queryFn: () => apiGet(`/properties`, {limit: 5})
    });

    console.log(properties);

    useEffect(() => {
        if (!isLoading && serverData) {
            setProperties(serverData.items);
        }
    }, [isLoading, serverData]);

    return (
        <section>
            {/* Section header with filter toggle */}
            <div className={'flex items-center justify-between mb-4'}>
                <h2 className={'font-bold m-0'}>
                    All properties
                    <span className={'text-sm text-gray-500 font-normal'}>({properties.length})</span>
                </h2>
                <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                    <button onClick={resetPropFilters}
                            className={'text-sm text-red-500 font-normal cursor-pointer border-0 px-4 py-2'}>
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
            <PropertyGrid properties={properties} onDelete={() => refetch()}/>
        </section>
    );
};

export default PropertyClient;