'use client';

import dayjs from "dayjs";
import {capitalize} from "@/lib/utils";
import {Play, Plus, Trash2} from "lucide-react";
import {useConfirm, useSpinner} from "@/contexts/AppContext";
import {apiDelete} from "@/lib/api";

interface InspectionCardProps {
    report: any;
    onDeleted?: (inspection: any) => void;
}

const InspectionTypeMaps: Record<string, string> = {
    'routine': 'Routine Inspection',
    'move-in': 'Move-in Inspection',
    'move-out': 'Move-out Inspection',
    'maintenance': 'Maintenance Check',
    'other': 'Other'
}

const InspectionCard = ({report, onDeleted}: InspectionCardProps) => {
    const spinner = useSpinner();
    const confirm = useConfirm();

    const handleDeleteInspection = () => {
        confirm.open({
            title: "Delete Inspection",
            message: "Are you sure you want to delete this inspection?",
            onConfirm: () => {
                spinner.show();
                apiDelete(`/inspection/reports/${report.id}`).then(() => {
                    onDeleted?.(report);
                }).catch(reason => {
                    console.error(reason);
                }).finally(() => {
                    spinner.hide();
                });
            }
        });
    }

    return (
        <div className={'border border-gray-600 rounded-lg overflow-hidden'}>
            <div className={`relative w-full pt-[45%]`}>
                <img src={report.property?.image} alt={report.property?.name}
                     className={'absolute top-0 left-0 w-full h-full object-cover'}/>
            </div>
            <div className={'p-3 flex flex-col gap-y-2'}>
                <div className={'flex items-center gap-2 justify-between'}>
                    <div className={'font-bold text-sm'}>{InspectionTypeMaps[report.type]}</div>
                    <div className={'flex flex-nowrap gap-x-2'}>
                        {
                            report.status === 'completed' ? (
                                <span className={'text-[12px] text-green-500'}>Completed</span>
                            ) : (
                                <span className={'text-[12px] text-red-500'}>{capitalize(report.status)}</span>
                            )
                        }
                        <span
                            className={`text-[12px] text-nowrap ${report.is_signed ? 'text-green-500' : 'text-red-500'}`}>{report.is_signed ? "✍️ Signed" : "⏳ Unsigned"}</span>
                    </div>
                </div>
                <div className={'text-[12px] text-gray-400'}>
                    <span>{dayjs(report.created_at).format('MMM DD, YYYY')}</span>
                    <span>. by </span>
                    <span>{report.user?.name}</span>
                </div>
                <div className={'text-[12px] text-blue-300/70'}>{report.subtext || 'No media uploaded yet - tap to continue'}</div>
                <div className={'pt-2 border-t border-gray-700 flex items-center justify-between'}>
                    <div
                        className={'text-[12px] font-bold text-blue-600 flex flex-nowrap items-center cursor-pointer'}>
                        {report.status === "completed" ? (
                            <>
                                <Play size={12}/>
                                Open Interactive Portal
                            </>
                        ) : (
                            <>
                                <Plus size={12}/>
                                Upload Media walkthrough
                            </>
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