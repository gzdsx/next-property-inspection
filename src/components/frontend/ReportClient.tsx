'use client';

import {useEffect, useState} from "react";
import {apiDelete, apiGet} from "@/lib/api";
import ReportCard from "@/components/frontend/ReportCard";
import {useConfirm, useSpinner} from "@/contexts/AppContext";

const ReportClient = () => {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const confirm = useConfirm();
    const spinner = useSpinner();

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await apiGet(`/inspection/reports`, {limit: 5});
            setReports([...response.data.items]);
        } catch (e) {

        } finally {
            setLoading(false);
        }
    }

    const handleDelete = (report: any) => {
        confirm.open({
            message:'Are you sure you want to delete this report?',
            onConfirm:()=>{
                spinner.show();
                apiDelete(`/inspection/reports/${report.id}`).then(() => {
                    fetchReports();
                }).finally(() => {
                    spinner.hide();
                });
            }
        })
    }

    useEffect(() => {
        fetchReports();
    }, []);

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