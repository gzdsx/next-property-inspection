'use client';

import dayjs from "dayjs";
import Link from "next/link";
import {capitalize} from "@/lib/utils";
import {useEffect, useState} from "react";
import {Pencil, Play, Plus, Trash2} from "lucide-react";
import {useConfirm, useInspection, useSpinner} from "@/contexts/AppContext";
import {useDeleteInspectionMutation, useUpdateInspectionMutation} from "@/queries/inspection";
import {useRouter} from "next/navigation";

interface InspectionCardProps {
    inspection: any;
    onDeleted?: (report: any) => void;
    onChange?: (report: any) => void;
}

const InspectionTypeMaps: Record<string, string> = {
    'routine': 'Routine Inspection',
    'movein': 'Move in Inspection',
    'moveout': 'Move out Inspection',
    'maintenance': 'Maintenance Check',
    'other': 'Other'
}

const FloatMenu = ({value, onChange}: { value: string, onChange: (value: string) => void }) => {
    return (
        <div
            className={`absolute top-0 left-0 z-50 bg-black border border-solid border-gray-600 rounded-[10px] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] min-w-50`}>
            {Object.entries(InspectionTypeMaps).map(([t, v]) => (
                <button
                    key={t}
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange(t);
                    }}
                    style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "8px 12px", border: "none", borderRadius: "7px",
                        background: value === t ? "rgba(99,102,241,0.22)" : "transparent",
                        color: value === t ? "var(--primary)" : "var(--foreground)",
                        fontWeight: value === t ? "bold" : "normal",
                        fontSize: "0.82rem", cursor: "pointer",
                        transition: "background 0.15s"
                    }}
                >
                    {v}
                </button>
            ))}
        </div>
    )
}

const InspectionCard = ({inspection, onDeleted, onChange}: InspectionCardProps) => {
    const router = useRouter();
    const spinner = useSpinner();
    const confirm = useConfirm();
    const {openInspection} = useInspection();
    const [isFloatMenuOpen, setIsFloatMenuOpen] = useState(false);
    const [reportType, setReportType] = useState(inspection.type);

    const {mutate: deleteInspection} = useDeleteInspectionMutation({
        onMutate: () => {
            spinner.show();
        },
        onSettled: () => {
            spinner.hide();
        },
        onError: (error, variables, context) => {
            console.error(error);
        },
        onSuccess: () => {
            onDeleted?.(inspection);
        }
    });

    const {mutate: updateInspection} = useUpdateInspectionMutation({
        onMutate: () => {
            spinner.show();
        },
        onSettled: () => {
            spinner.hide();
        },
        onError: (error, variables, context) => {
            console.error(error);
        },
        onSuccess: () => {
            onChange?.(inspection);
        }
    });

    const handleDeleteInspection = () => {
        confirm.open({
            title: "Delete Inspection",
            message: "Are you sure you want to delete this inspection?",
            onConfirm: () => deleteInspection(inspection.id)
        });
    }

    const handleUpdateInspection = (type: string) => {
        setReportType(type);
        updateInspection({id: inspection.id, data: {type}} as any);
    }

    useEffect(() => {
        if (!isFloatMenuOpen) return; // 如果菜单本身没开，根本没必要绑定全局监听，进一步省内存

        const closeMenu = () => {
            setIsFloatMenuOpen(false);
        };

        document.addEventListener('click', closeMenu);
        return () => {
            document.removeEventListener('click', closeMenu);
        };
    }, [isFloatMenuOpen]);

    return (
        <div className={'border border-gray-600 rounded-lg'}>
            <div className={`relative w-full rounded-tl-lg rounded-tr-lg overflow-hidden`}>
                <Link href={`/report/${inspection.id}`}>
                    <img
                        src={inspection.image ? inspection.image : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80"}
                        alt={inspection.property?.name}
                        className={'w-full aspect-4/3 object-contain'}
                        onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80";
                        }}
                    />
                </Link>
            </div>
            <div className={'p-3 flex flex-col gap-y-2'} onClick={e => e.nativeEvent.stopPropagation()}>
                <div className={'flex flex-col gap-y-2 min-h-25'}>
                    <div className={'flex justify-between items-center'}>
                        <h3
                            onClick={(e) => {
                                e.nativeEvent.stopPropagation();
                                setIsFloatMenuOpen(true);
                            }}
                            className={'font-bold text-sm flex items-center gap-x-2 cursor-pointer relative'}
                        >
                            {InspectionTypeMaps[reportType]}
                            <Pencil size={12}/>
                            {
                                isFloatMenuOpen && (
                                    <FloatMenu value={reportType} onChange={handleUpdateInspection}/>
                                )
                            }
                        </h3>
                        <span
                            className={'text-[12px] font-normal text-blue-300'}>{inspection.items_count || 0} items</span>
                    </div>
                    <div className={'flex flex-nowrap gap-x-2'}>
                        {
                            inspection.status === 'completed' ? (
                                <span className={'text-[12px] text-green-500'}>Completed</span>
                            ) : (
                                <span className={'text-[12px] text-red-500'}>{capitalize(inspection.status)}</span>
                            )
                        }
                        <span
                            className={`text-[12px] text-nowrap ${inspection.signature ? 'text-green-500' : 'text-red-500'}`}>{inspection.signature ? "✍️ Signed" : "⏳ Unsigned"}</span>
                    </div>
                    <div className={'text-[12px] text-gray-400'}>
                        <span>{dayjs(inspection.created_at).format('MMM DD, YYYY')}</span>
                        <span>. by </span>
                        <span>{inspection.user?.name}</span>
                    </div>
                    {
                        inspection.video_url ? (
                            <div className={'text-[12px] text-blue-300/70'}>{inspection.subtext}</div>
                        ) : (
                            <div
                                className={'text-[12px] text-blue-300/70'}>{'No media uploaded yet - tap to continue'}</div>
                        )
                    }
                </div>

                <div className={'pt-2 border-t border-gray-700 flex items-center justify-between'}>
                    <div
                        className={'text-[12px] font-bold text-blue-600 cursor-pointer'}>
                        {inspection.status === "completed" ? (
                            <div className={'flex flex-nowrap items-center gap-x-1'}
                                 onClick={() => router.push(`/report/${inspection.id}`)}>
                                <Play size={12}/>
                                Open Interactive Portal
                            </div>
                        ) : (
                            <div className={'flex flex-nowrap items-center gap-x-1'}
                                 onClick={() => router.push(`/report/${inspection.id}/edit`)}>
                                <Plus size={12}/>
                                Upload Media walkthrough
                            </div>
                        )}
                    </div>
                    <a className={'rounded-sm p-1 hover:bg-gray-600 cursor-pointer'} onClick={handleDeleteInspection}>
                        <Trash2 size={16} className={'text-red-500'}/>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default InspectionCard;