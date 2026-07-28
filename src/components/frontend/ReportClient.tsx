'use client';

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ChevronRight} from "lucide-react";
import ReportCard from "@/components/frontend/ReportCard";
import {useConfirm, useSpinner} from "@/contexts/AppContext";
import {useDeleteInspectionMutation, useInspectionListQuery, useUpdateInspectionMutation} from "@/queries/inspection";
import ModalChooseProperty from "@/components/frontend/ModalChooseProperty";

const ReportClient = () => {
    const router = useRouter();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isChooseProperty, setIsChooseProperty] = useState(false);
    const confirm = useConfirm();
    const spinner = useSpinner();
    const editingReportId = useRef(null);

    const {
        data: inspectionData,
        isFetching: isInspectionFetching,
        refetch: refetchInspections
    } = useInspectionListQuery({limit: 5, is_new: 1});

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
        onSuccess: (data, variables, onMutateResult, context) => {
            refetchInspections();
        }
    });

    const {mutate: updateInspection} = useUpdateInspectionMutation({
        onMutate: () => {
            setIsChooseProperty(false);
            spinner.show();
        },
        onSettled: () => {
            spinner.hide();
        },
        onError: (error, variables, context) => {
            console.error(error);
        },
        onSuccess: (data, variables, onMutateResult, context) => {
            refetchInspections();
        }
    });

    const handleDelete = (report: any) => {
        confirm.open({
            message: 'Are you sure you want to delete this report?',
            onConfirm: () => {
                deleteInspection(report.id);
            }
        })
    }

    useEffect(() => {
        if (!isInspectionFetching) setReports(inspectionData.items);
    }, [isInspectionFetching, inspectionData]);

    return (
        <>
            <section className={'mb-10'}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold m-0">
                        Recent inspections
                        <span className="font-normal text-gray-400 text-sm ml-1">({reports.length})</span>
                    </h2>
                    <Link href="/inspections"
                          className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                        View more <ChevronRight size={14}/>
                    </Link>
                </div>

                <div className="property-grid">
                    {reports.map((report: any) => (
                        <ReportCard
                            report={report}
                            key={`report-${report.id}`}
                            onDelete={handleDelete}
                            onClickHome={() => {
                                editingReportId.current = report.id;
                                setIsChooseProperty(true);
                            }}
                        />
                    ))}
                </div>
            </section>
            {
                isChooseProperty && (
                    <ModalChooseProperty
                        onClose={() => setIsChooseProperty(false)}
                        onChoose={(property) => updateInspection({
                            id: editingReportId.current,
                            data: {property_id: property.id}
                        } as any)}
                    />
                )
            }
        </>
    );
};

export default ReportClient;