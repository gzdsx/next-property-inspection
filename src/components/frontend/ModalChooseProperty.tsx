'use client';

import {useMemo, useState} from "react";
import CloseIcon from "@/components/frontend/CloseIcon";
import ModalProperty from "@/components/frontend/ModalProperty";
import {Spinner} from "@/components/ui/spinner";
import {useConfirm, useSpinner} from "@/contexts/AppContext";
import {useDeletePropertyMutation, usePropertyListQuery} from "@/queries/property";
import {Property} from "@/types";
import {Check, ChevronRight, Pencil, Plus, Search, SlidersHorizontal, Trash2} from "lucide-react";
import {useQueryClient} from "@tanstack/react-query";

interface ModalChoosePropertyProps {
    onClose: () => void;
    onChoose: (property: Property) => void;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80";

const ModalChooseProperty = ({onClose, onChoose}: ModalChoosePropertyProps) => {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const spinner = useSpinner();
    const [keyword, setKeyword] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [country, setCountry] = useState('');
    const [province, setProvince] = useState('');
    const [city, setCity] = useState('');
    const [bedrooms, setBedrooms] = useState('');
    const [bathrooms, setBathrooms] = useState('');
    const [kitchen, setKitchen] = useState('');
    const [hallway, setHallway] = useState('');
    const [added, setAdded] = useState('');

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [editProperty, setEditProperty] = useState<Property | null>(null);

    const {data, isFetching, refetch} = usePropertyListQuery({limit: 50});
    const allItems: Property[] = (data?.items as Property[]) ?? [];

    const {mutate: deleteProperty} = useDeletePropertyMutation({
        onSuccess: (data, deleteId: any, context) => {
            queryClient.setQueriesData({queryKey: ['properties']}, (old: any) => {
                return {
                    ...old,
                    items: old.items.filter((p: any) => p.id !== deleteId)
                }
            });
        },
        onError: (error) => console.error(error),
        onMutate: () => {
            spinner.show();
        },
        onSettled: () => {
            spinner.hide();
        }
    });

    const resetFilters = () => {
        setCountry('');
        setProvince('');
        setCity('');
        setKeyword('');
        setBedrooms('');
        setBathrooms('');
        setKitchen('');
        setHallway('');
        setAdded('');
    };

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        const now = Date.now();
        return allItems.filter(p => {
            if (kw) {
                const hay = `${p.name} ${p.type} ${p.address_line_1} ${p.address_line_2} ${p.city} ${p.state} ${p.postcode} ${p.country}`.toLowerCase();
                if (!hay.includes(kw)) return false;
            }
            if (country && !(p.country || '').toLowerCase().includes(country.replace(/_/g, ' '))) return false;
            if (province && !`${p.state}`.toLowerCase().includes(province.toLowerCase())) return false;
            if (city && !`${p.city}`.toLowerCase().includes(city.toLowerCase())) return false;
            if (bedrooms) {
                if (bedrooms === '4+') {
                    if ((p.bedrooms || 0) < 4) return false;
                } else if (p.bedrooms !== Number(bedrooms)) return false;
            }
            if (bathrooms) {
                const total = (p.main_bathrooms || 0) + (p.ensuite_bathrooms || 0);
                if (bathrooms === '3+') {
                    if (total < 3) return false;
                } else if (total !== Number(bathrooms)) return false;
            }
            if (kitchen && (p.kitchen_type || '') !== kitchen) return false;
            if (hallway) {
                const has = Array.isArray(p.rooms) && p.rooms.includes('hallway');
                if (hallway === 'yes' && !has) return false;
                if (hallway === 'no' && has) return false;
            }
            if (added) {
                const updated = new Date(p.last_updated_at).getTime();
                if (!updated || isNaN(updated)) return false;
                const days = (now - updated) / 86400000;
                const limit = added === 'week' ? 7 : added === 'month' ? 30 : added === 'quarter' ? 90 : 365;
                if (days > limit) return false;
            }
            return true;
        });
    }, [allItems, keyword, country, province, city, bedrooms, bathrooms, kitchen, hallway, added]);

    const handleDelete = (p: Property) => {
        confirm.open({
            title: 'Delete Property',
            message: `Are you sure you want to delete "${p.name}"? This action cannot be undone.`,
            onConfirm: () => deleteProperty(p.id as any)
        });
    };

    const handleConfirm = () => {
        const selected = allItems.find(p => p.id === selectedId);
        if (selected) onChoose(selected);
    };

    const filterFieldLabel = "font-bold text-gray-500 text-[0.7rem] uppercase tracking-wide";

    return (
        <div className="modal-backdrop z-50!" onClick={onClose}>
            <div className="glass-panel modal-card max-w-3xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/8 flex justify-between items-center">
                    <h3 className="m-0 text-lg font-bold">Choose Property</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAddOpen(true)}
                            className="flex items-center gap-1 px-3 h-9 bg-blue-500 border-none rounded-lg text-white font-bold cursor-pointer text-sm"
                        >
                            <Plus size={15}/> Add
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-transparent border-none text-gray-500 cursor-pointer"
                            aria-label="Close"
                        >
                            <CloseIcon/>
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="px-6 pt-4">
                    <div className="relative">
                        <Search size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                        <input
                            className="sheet-input w-full pl-9"
                            placeholder="Search by name, address, city..."
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filter toggle bar */}
                <div className="px-6 pt-3 flex items-center justify-between">
                    <button
                        onClick={resetFilters}
                        className="text-sm text-red-500 font-normal cursor-pointer border-0 bg-transparent px-0"
                    >
                        Clear filters
                    </button>
                    <button
                        onClick={() => setShowFilters(f => !f)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 14px",
                            borderRadius: "10px",
                            border: "1px solid var(--panel-border)",
                            background: showFilters ? "var(--primary-bg)" : "transparent",
                            color: showFilters ? "var(--primary)" : "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "600"
                        }}
                    >
                        <SlidersHorizontal size={15}/>
                        Filters
                    </button>
                </div>

                {/* Filter panel */}
                {showFilters && (
                    <div className="glass-panel" style={{
                        margin: "12px 24px",
                        padding: "18px 20px",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                        gap: "14px"
                    }}>
                        <div className="flex flex-col gap-1.5">
                            <label className={filterFieldLabel}>Country</label>
                            <select className="sheet-select" style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                    value={country} onChange={e => setCountry(e.target.value)}>
                                <option value="">All</option>
                                <option value="ireland">Ireland 🇮🇪</option>
                                <option value="northern_ireland">Northern Ireland 🇬🇧</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={filterFieldLabel}>Province</label>
                            <input className="sheet-input" style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                   placeholder="e.g. Ulster" value={province}
                                   onChange={e => setProvince(e.target.value)}/>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={filterFieldLabel}>City</label>
                            <input className="sheet-input" style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                   placeholder="e.g. Belfast" value={city}
                                   onChange={e => setCity(e.target.value)}/>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={filterFieldLabel}>🛏 Bedrooms</label>
                            <select className="sheet-select" style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                    value={bedrooms} onChange={e => setBedrooms(e.target.value)}>
                                <option value="">Any</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4+">4+</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={filterFieldLabel}>🛁 Bathrooms</label>
                            <select className="sheet-select" style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                    value={bathrooms} onChange={e => setBathrooms(e.target.value)}>
                                <option value="">Any</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3+">3+</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={filterFieldLabel}>🍳 Kitchen</label>
                            <select className="sheet-select" style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                    value={kitchen} onChange={e => setKitchen(e.target.value)}>
                                <option value="">Any</option>
                                <option value="standard">Standard</option>
                                <option value="combo">Kitchen/Living</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={filterFieldLabel}>🚪 Hallway</label>
                            <select className="sheet-select" style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                    value={hallway} onChange={e => setHallway(e.target.value)}>
                                <option value="">Any</option>
                                <option value="yes">Included</option>
                                <option value="no">Not Included</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={filterFieldLabel}>📅 Added</label>
                            <select className="sheet-select" style={{fontSize: "0.8rem", padding: "7px 10px"}}
                                    value={added} onChange={e => setAdded(e.target.value)}>
                                <option value="">Any time</option>
                                <option value="week">Last 7 days</option>
                                <option value="month">Last 30 days</option>
                                <option value="quarter">Last 3 months</option>
                                <option value="year">Last year</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Result count */}
                <div className="px-6 pt-1 pb-2 text-sm text-gray-500">
                    {isFetching ? 'Loading…' : `${filtered.length} propert${filtered.length === 1 ? 'y' : 'ies'} found`}
                </div>

                {/* List */}
                <div className="px-6 pb-2 overflow-y-auto" style={{maxHeight: "46vh"}}>
                    {isFetching ? (
                        <div className="flex justify-center py-10">
                            <Spinner/>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="m-0 text-sm">No properties match your filters.</p>
                            <button
                                onClick={resetFilters}
                                className="mt-2 text-sm text-blue-400 border-0 bg-transparent cursor-pointer"
                            >
                                Reset filters
                            </button>
                        </div>
                    ) : (
                        filtered.map(p => {
                            const totalBaths = (p.main_bathrooms || 0) + (p.ensuite_bathrooms || 0);
                            const isSelected = selectedId === p.id;
                            return (
                                <div
                                    key={p.id}
                                    className="glass-panel glass-panel-hover"
                                    style={{
                                        display: "flex",
                                        alignItems: "stretch",
                                        padding: "12px",
                                        marginBottom: "10px",
                                        borderRadius: "12px",
                                        border: isSelected ? "1px solid var(--primary)" : "1px solid var(--panel-border)",
                                        background: isSelected ? "var(--primary-bg)" : undefined
                                    }}
                                >
                                    <button
                                        onClick={() => setSelectedId(prev => (prev === p.id ? null : p.id))}
                                        className="flex items-center gap-3.5 text-left flex-1 bg-transparent border-none cursor-pointer min-w-0"
                                        style={{padding: 0}}
                                    >
                                        <img
                                            src={p.image || FALLBACK_IMAGE}
                                            alt=""
                                            onError={e => {
                                                (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                                            }}
                                            style={{
                                                width: "76px",
                                                height: "56px",
                                                borderRadius: "8px",
                                                objectFit: "cover",
                                                flexShrink: 0,
                                                background: "#1e293b"
                                            }}
                                        />
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <h4 className="truncate m-0"
                                                style={{fontSize: "0.9rem", fontWeight: "bold"}}>
                                                {p.name}
                                            </h4>
                                            <p className="truncate m-0"
                                               style={{
                                                   fontSize: "0.75rem",
                                                   color: "var(--text-muted)",
                                                   marginTop: "2px"
                                               }}>
                                                {p.type}{p.city ? ` · ${p.city}` : ''}
                                            </p>
                                            <div style={{
                                                fontSize: "0.75rem",
                                                color: "var(--text-muted)",
                                                marginTop: "4px"
                                            }}>
                                                🛏 {p.bedrooms} · 🛁 {totalBaths}
                                            </div>
                                        </div>
                                        {isSelected &&
                                            <Check size={18} className="text-blue-400" style={{flexShrink: 0}}/>}
                                    </button>

                                    <div
                                        className="flex items-center gap-1 pl-2"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => setEditProperty(p)}
                                            title="Edit"
                                            className="w-8 h-8 rounded-lg border-none bg-white/5 text-gray-300 flex items-center justify-center cursor-pointer hover:bg-white/10"
                                        >
                                            <Pencil size={15}/>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p)}
                                            title="Delete"
                                            className="w-8 h-8 rounded-lg border-none bg-white/5 text-red-400 flex items-center justify-center cursor-pointer hover:bg-red-500/15"
                                        >
                                            <Trash2 size={15}/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3">
                    <button onClick={onClose} className="sheet-select px-5 py-2.5">
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedId === null}
                        className="px-6 h-9.5 bg-blue-500 border-none rounded-lg text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                        Confirm
                    </button>
                </div>
            </div>

            {/* Add / Edit property modal */}
            {addOpen && (
                <ModalProperty
                    onClose={() => setAddOpen(false)}
                    onSave={() => {
                        setAddOpen(false);
                        refetch();
                    }}
                />
            )}
            {editProperty && (
                <ModalProperty
                    editMode
                    property={editProperty}
                    onClose={() => setEditProperty(null)}
                    onSave={() => {
                        setEditProperty(null);
                        refetch();
                    }}
                />
            )}
        </div>
    );
};

export default ModalChooseProperty;
