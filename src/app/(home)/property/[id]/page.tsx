"use client";

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft,
    ClipboardList,
    LogIn,
    LogOut,
    MoreHorizontal,
    Pencil,
    Wrench
} from "lucide-react";
import ModalProperty from "@/components/frontend/ModalProperty";
import {useSpinner} from "@/contexts/AppContext";
import {toast} from "sonner";
import InspectionGrid from "@/components/frontend/InspectionGrid";
import {usePropertyQuery} from "@/queries/property";
import {useCreateInspectionMutation, useInspectionsQuery} from "@/queries/inspection";
import {Inspection} from "@/types";

export default function PropertyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const spinner = useSpinner();
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [isDuplicateAddress, setIsDuplicateAddress] = useState(false);

    const {data: property, refetch: refetchProperty, isFetching: isPropertyFetching} = usePropertyQuery(id);
    const {data: inpectionData, isFetching: isInspectionFetching} = useInspectionsQuery({property_id: id});
    const {mutate: createInspection} = useCreateInspectionMutation({
        onMutate: () => {
            spinner.show();
        },
        onSettled: () => {
            spinner.hide();
        },
        onSuccess: (data: any) => {
            setInspections((prevState: Inspection[]) => [...prevState, data]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    })


    const handleAddInspection = (type: "routine" | "move-in" | "move-out" | "maintenance" | "other") => {
        createInspection({
            type: type || 'routine',
            property_id: id,
            status: "draft"
        } as any)
    }

    useEffect(() => {
        if (!isInspectionFetching) setInspections(inpectionData.items);
    }, [isInspectionFetching, inpectionData]);

    return (
        <>
            <header style={{marginBottom: "32px"}}>
                <Link href="/" className={'flex items-center gap-2 text-sm font-bold text-gray-500 mb-2'}>
                    <ChevronLeft size={16}/>
                    Back to Properties
                </Link>
                <div className={'flex justify-between items-start'}>
                    <div>
                        <h1 style={{fontSize: "1.75rem", fontWeight: "900", letterSpacing: "-0.5px"}}>
                            {property?.name || "19a Cliftonville Avenue, Belfast"}
                        </h1>
                        <p style={{fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px"}}>
                            {property?.type || "Standard HMO/Property"} · {property?.bedrooms} Bedrooms
                            · {property?.main_bathrooms} Bathrooms
                        </p>
                    </div>

                    <div className={'flex items-center gap-3'}>
                        <button
                            onClick={() => setIsPropertyModalOpen(true)}
                            className={'badge badge-success'}
                        >
                            <Pencil size={14}/>
                            Edit Property
                        </button>
                        <div className="badge badge-success" style={{fontSize: "0.75rem", padding: "6px 12px"}}>
                            Active Property Portfolio
                        </div>
                    </div>
                </div>
                {isDuplicateAddress && (
                    <div className="glass-panel" style={{
                        padding: "12px 18px", marginTop: "16px", borderLeft: "4px solid var(--warning)",
                        background: "rgba(245, 158, 11, 0.08)", color: "var(--warning)",
                        fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px",
                        borderRadius: "8px"
                    }}>
                        <span>⚠️ Note: There are other property records with this identical address in the system database.</span>
                    </div>
                )}
            </header>

            <section>
                <h2 style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    marginBottom: "20px",
                    letterSpacing: "-0.2px"
                }}>
                    Historical Walkthrough Visits
                </h2>
                {
                    (isInspectionFetching || isPropertyFetching) ? (
                        <div style={{textAlign: "center", padding: "60px", color: "var(--text-muted)"}}>
                            Loading property walkthroughs...
                        </div>
                    ) : (
                        <>
                            {
                                inspections.length === 0 ? (
                                    <div className="glass-panel"
                                         style={{padding: "60px", textAlign: "center", borderStyle: "dashed"}}>
                                        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>No
                                            inspections registered for this property.</p>
                                        <p style={{
                                            color: "var(--text-dark)",
                                            fontSize: "0.75rem",
                                            marginTop: "4px"
                                        }}>Use the floating menu below to register a Routine, Move-in/out, or
                                            Maintenance check.</p>
                                    </div>
                                ) : (
                                    <InspectionGrid data={inspections} onDeleted={(inspection) => {
                                        setInspections(prevState => prevState.filter(i => i.id !== inspection.id));
                                    }}/>
                                )
                            }
                        </>
                    )
                }
            </section>

            <div style={{
                position: "fixed",
                bottom: "32px",
                left: "calc(50% + var(--sidebar-width)/2)",
                transform: "translateX(-50%)",
                zIndex: 80
            }}>
                <div className="float-bar">
                    <button className="float-btn" onClick={() => handleAddInspection("routine")}>
                        <ClipboardList size={20}/>
                        <span>Routine</span>
                    </button>
                    <button className="float-btn" onClick={() => handleAddInspection("move-in")}>
                        <LogIn size={20}/>
                        <span>Move In</span>
                    </button>
                    <button className="float-btn" onClick={() => handleAddInspection("move-out")}>
                        <LogOut size={20}/>
                        <span>Move Out</span>
                    </button>
                    <button className="float-btn" onClick={() => handleAddInspection("maintenance")}>
                        <Wrench size={20}/>
                        <span>Maintenance</span>
                    </button>
                    <button className="float-btn" onClick={() => handleAddInspection("other")}>
                        <MoreHorizontal size={20}/>
                        <span>Other</span>
                    </button>
                </div>
            </div>

            {
                isPropertyModalOpen && (
                    <ModalProperty
                        editMode={true}
                        onClose={() => setIsPropertyModalOpen(false)}
                        onSave={() => refetchProperty()}
                        property={property}
                    />
                )
            }
        </>
    );
}
