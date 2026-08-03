'use client';

import {useMemo, useState} from "react";
import Link from "next/link";
import PropertyGrid from "@/components/frontend/PropertyGrid";
import CloseIcon from "@/components/frontend/CloseIcon";
import {ChevronRight, SlidersHorizontal} from "lucide-react";
import {usePropertyListQuery} from "@/queries/property";
import {Property} from "@/types";

const PropertyClient = () => {
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
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
    const {data: serverData, isFetching, refetch} = usePropertyListQuery({limit: 5});
    const allItems: Property[] = (serverData?.items as Property[]) ?? [];

    const filtered = useMemo(() => {
        const kw = filterKeyword.trim().toLowerCase();
        const now = Date.now();
        return allItems.filter(p => {
            if (kw) {
                const hay = `${p.name} ${p.type} ${p.address_line_1} ${p.address_line_2} ${p.city} ${p.state} ${p.postcode} ${p.country}`.toLowerCase();
                if (!hay.includes(kw)) return false;
            }
            if (filterCountry && !(p.country || '').toLowerCase().includes(filterCountry.replace(/_/g, ' '))) return false;
            if (filterProvince && !`${p.state}`.toLowerCase().includes(filterProvince.toLowerCase())) return false;
            if (filterCity && !`${p.city}`.toLowerCase().includes(filterCity.toLowerCase())) return false;
            if (filterBedrooms) {
                if (filterBedrooms === '4+') {
                    if ((p.bedrooms || 0) < 4) return false;
                } else if (p.bedrooms !== Number(filterBedrooms)) return false;
            }
            if (filterBathrooms) {
                const total = (p.main_bathrooms || 0) + (p.ensuite_bathrooms || 0);
                if (filterBathrooms === '3+') {
                    if (total < 3) return false;
                } else if (total !== Number(filterBathrooms)) return false;
            }
            if (filterKitchen && (p.kitchen_type || '') !== filterKitchen) return false;
            if (filterHallway) {
                const has = Array.isArray(p.rooms) && p.rooms.includes('hallway');
                if (filterHallway === 'yes' && !has) return false;
                if (filterHallway === 'no' && has) return false;
            }
            if (filterTime) {
                const updated = new Date(p.last_updated_at).getTime();
                if (!updated || isNaN(updated)) return false;
                const days = (now - updated) / 86400000;
                const limit = filterTime === 'week' ? 7 : filterTime === 'month' ? 30 : filterTime === 'quarter' ? 90 : 365;
                if (days > limit) return false;
            }
            return true;
        });
    }, [allItems, filterKeyword, filterCountry, filterProvince, filterCity, filterBedrooms, filterBathrooms, filterKitchen, filterHallway, filterTime]);

    const filterFieldLabel = "font-bold text-gray-500 text-[0.7rem] uppercase tracking-wide";

    return (
        <section>
            {/* Section header with filter toggle */}
            <div className={'flex items-center justify-between mb-4 flex-wrap gap-2'}>
                <h2 className={'font-bold m-0'}>
                    All properties
                    <span className={'text-sm text-gray-500 font-normal ml-1'}>({filtered.length})</span>
                </h2>
                <div style={{display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap"}}>
                    <Link href="/properties" className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mr-2">
                        View more <ChevronRight size={14}/>
                    </Link>
                    <button
                        onClick={() => setIsFiltersOpen(true)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 14px",
                            borderRadius: "10px",
                            border: "1px solid var(--panel-border)",
                            background: isFiltersOpen ? "var(--primary-bg)" : "transparent",
                            color: isFiltersOpen ? "var(--primary)" : "var(--text-muted)",
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

            <PropertyGrid properties={filtered} onDelete={() => refetch()}/>

            {/* Filter Modal */}
            {isFiltersOpen && (
                <div className="modal-backdrop z-100!" onClick={() => setIsFiltersOpen(false)}>
                    <div className="glass-panel modal-card max-w-187.5" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-white/8 flex justify-between items-center">
                            <h3 className="m-0 text-lg font-bold">Filter Properties</h3>
                            <button
                                onClick={() => setIsFiltersOpen(false)}
                                className="bg-transparent border-none text-gray-500 cursor-pointer"
                                aria-label="Close"
                            >
                                <CloseIcon/>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto" style={{maxHeight: "60vh"}}>
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                                gap: "14px"
                            }}>
                                {/* Country */}
                                <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                                    <label className={filterFieldLabel}>Country</label>
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
                                    <label className={filterFieldLabel}>Province</label>
                                    <input className="sheet-input"
                                           style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                           placeholder="e.g. Ulster" value={filterProvince}
                                           onChange={e => setFilterProvince(e.target.value)}/>
                                </div>

                                {/* City */}
                                <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                                    <label className={filterFieldLabel}>City</label>
                                    <input className="sheet-input"
                                           style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                           placeholder="e.g. Belfast" value={filterCity}
                                           onChange={e => setFilterCity(e.target.value)}/>
                                </div>

                                {/* Keyword */}
                                <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                                    <label className={filterFieldLabel}>Keyword</label>
                                    <input className="sheet-input"
                                           style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                           placeholder="Address, type..." value={filterKeyword}
                                           onChange={e => setFilterKeyword(e.target.value)}/>
                                </div>

                                {/* Bedrooms */}
                                <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                                    <label className={filterFieldLabel}>🛏 Bedrooms</label>
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
                                    <label className={filterFieldLabel}>🛁 Bathrooms</label>
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
                                    <label className={filterFieldLabel}>🍳 Kitchen</label>
                                    <select className="sheet-select"
                                            style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                            value={filterKitchen}
                                            onChange={e => setFilterKitchen(e.target.value)}>
                                        <option value="">Any</option>
                                        <option value="standard">Standard</option>
                                        <option value="combo">Kitchen/Living</option>
                                    </select>
                                </div>

                                {/* Hallway / Living Room */}
                                <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                                    <label className={filterFieldLabel}>🚪 Hallway</label>
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
                                    <label className={filterFieldLabel}>📅 Added</label>
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
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3">
                            <button onClick={resetPropFilters} className="sheet-select px-5 py-2.5">
                                Reset
                            </button>
                            <button
                                onClick={() => setIsFiltersOpen(false)}
                                className="px-6 h-9.5 bg-blue-500 border-none rounded-lg text-white font-bold cursor-pointer"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default PropertyClient;
