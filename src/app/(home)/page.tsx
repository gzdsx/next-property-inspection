"use client";

import {useState} from "react";
import {Search, RefreshCcw, Plus} from "lucide-react";
import ModalSettings from "@/components/frontend/ModalSettings";
import ModalProperty from "@/components/frontend/ModalProperty";
import PropertyClient from "@/components/frontend/PropertyClient";
import Link from "next/link";
import {Input} from "@/components/ui/input";
import ReportClient from "@/components/frontend/ReportClient";

interface ReportSummary {
    id: string;
    timestamp: number;
    createdAt: string;
    defectCount: number;
    address?: string;
    inspectorName?: string;
    isSigned?: boolean;
    isOfflineVideo?: boolean;
    companyName?: string;
    conditionStats?: { poor: number; fair: number; good: number };
    coverPhoto?: string;
}

interface Property {
    id: string;
    name: string;
    type: string;
    image?: string;
    visitCount: number;
    lastUpdated: string;
    rooms: {
        kitchenType: string;
        bedrooms: number;
        bathrooms: number;
        hallway: boolean;
        outdoor: boolean;
        ensuite?: number;
        livingRooms?: number;
        storeys?: number;
        study?: boolean;
        utility?: boolean;
        guestWc?: boolean;
        storage?: boolean;
    };
}

const getAddressSimilarity = (addr1: string, addr2: string): number => {
    const cleanAndTokenize = (str: string) => {
        return str
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
            .split(/\s+/)
            .filter(w => w.length > 1);
    };

    const tokens1 = cleanAndTokenize(addr1 || "");
    const tokens2 = cleanAndTokenize(addr2 || "");

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    let matches = 0;
    const set2 = new Set(tokens2);
    for (const token of tokens1) {
        if (set2.has(token)) {
            matches++;
        }
    }

    return matches / Math.max(tokens1.length, tokens2.length);
};

export default function Home() {
    // Navigation & UI States
    const [activeTab, setActiveTab] = useState<"home" | "analytics">("home");
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [searchText, setSearchText] = useState("");

    const [inspectorProfile, setInspectorProfile] = useState({
        companyName: 'Irish PropTech Agency',
        inspectorName: 'Steven Smith',
        phone: '07701 068531',
        email: 'inspector@irishproptech.ie',
        reference: '035474'
    });


    // Data States
    const [reports, setReports] = useState<ReportSummary[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Toast notification state
    const [toasts, setToasts] = useState<Array<{
        id: string;
        msg: string;
        type: 'success' | 'error' | 'info' | 'warning'
    }>>([]);
    const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, {id, msg, type}]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    // Link to Property state
    const [linkingReport, setLinkingReport] = useState<ReportSummary | null>(null);
    const [selectedPropId, setSelectedPropId] = useState<string>('');
    const [isLinking, setIsLinking] = useState(false);

    const [propertyGridKey, setPropertyGridKey] = useState(0);

    const NI_CITIES = ['belfast', 'derry', 'londonderry', 'lisburn', 'newry', 'armagh', 'ballymena', 'antrim', 'coleraine', 'bangor', 'newtownabbey', 'carrickfergus', 'ards', 'larne', 'strabane', 'omagh', 'enniskillen', 'downpatrick'];
    const IE_CITIES = ['dublin', 'cork', 'galway', 'limerick', 'waterford', 'kilkenny', 'wexford', 'drogheda', 'sligo', 'tralee', 'ennis', 'athlone', 'dundalk', 'navan', 'celbridge', 'naas', 'bray', 'swords', 'tallaght'];

    return (
        <>
            <header className="dashboard-header">
                <div>
                    <h1 style={{fontSize: "1.75rem", fontWeight: "900", letterSpacing: "-0.5px"}}>
                        Video Inspections
                    </h1>
                    <p style={{fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "2px"}}>
                        AI Multimodal Property Verification
                    </p>
                </div>

                <div className={'flex gap-4 w-full max-w-150 justify-end'}>
                    {/* Search Bar */}
                    <div className="flex flex-row items-center gap-2 border border-gray-700 rounded-full px-4">
                        <input
                            type="text"
                            className="px-4"
                            placeholder="Search properties, visits, rooms..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                        <Search size={18} color={'#6B7280'}/>
                    </div>

                    <div>
                        <button className="rounded-full w-10 h-10 border border-gray-700">
                            <RefreshCcw size={18} style={{margin: "auto"}}/>
                        </button>
                    </div>

                    <div>
                        <button
                            onClick={() => setIsAddPropertyOpen(true)}
                            className={'flex items-center gap-2 bg-blue-600 rounded-sm px-4 py-2'}
                        >
                            <Plus size={18}/>
                            <span className={'text-sm text-nowrap'}>Add Property</span>
                        </button>
                    </div>

                    <Link href={'/inspection'}>
                        <button className={'flex items-center gap-2 bg-blue-600 rounded-sm px-4 py-2'}>
                            <Plus size={18}/>
                            <span className={'text-sm text-nowrap'}>Add Inspection</span>
                        </button>
                    </Link>
                </div>
            </header>

            <ReportClient/>

            <PropertyClient key={propertyGridKey}/>

            {/* ── ADD PROPERTY DIALOG WIZARD ────────────────────────────────────── */}
            {isAddPropertyOpen && (
                <ModalProperty
                    onClose={() => setIsAddPropertyOpen(false)}
                    onSave={() => {
                        setIsAddPropertyOpen(false);
                        setPropertyGridKey(prevState => prevState + 1);
                    }}
                />
            )}

            {/* ── ORGANISATION SETTINGS OVERLAY ─────────────────────────────────── */}
            {isSettingsOpen && (
                <ModalSettings
                    onClose={() => setIsSettingsOpen(false)}
                    onSave={() => {
                        setIsSettingsOpen(false);
                    }}
                />
            )}
        </>
    );
}
