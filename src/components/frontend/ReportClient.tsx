'use client';

import {useEffect, useState} from "react";
import ReportCard from "@/components/frontend/ReportCard";
import {useConfirm, useSpinner} from "@/contexts/AppContext";
import {useDeleteInspectionMutation, useInspectionsQuery} from "@/queries/inspection";

const ReportClient = () => {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const confirm = useConfirm();
    const spinner = useSpinner();

    const {
        data: inspectionData,
        isFetching: isInspectionFetching,
        refetch: refetchInspections
    } = useInspectionsQuery({limit: 5});

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
    })

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
        <section className={'mb-10'}>
            <h2 className={'font-bold mb-4'}>
                <span>Recent inspections</span>
                <span className={'font-normal text-gray-400 text-sm'}>({reports.length})</span>
            </h2>

            <div className="property-grid">
                {reports.map((report: any) => (
                    <ReportCard report={report} onDelete={handleDelete} key={`report-${report.id}`}/>
                ))}
            </div>
        </section>
    );
};

export default ReportClient;