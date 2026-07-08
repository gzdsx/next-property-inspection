'use client';

import {Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {Plus} from 'lucide-react';
import ReportCard from '@/components/frontend/ReportCard';
import CustomPagination from '@/components/frontend/CustomPagination';
import {useDeleteInspectionMutation, useInspectionListQuery} from '@/queries/inspection';
import {useConfirm, useSpinner} from '@/contexts/AppContext';

const PAGE_SIZE = 20;

function InspectionsContent() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const confirm = useConfirm();
    const spinner = useSpinner();
    const [reports, setReports] = useState<any[]>([]);

    const {data, isFetching, refetch} = useInspectionListQuery({page, limit: PAGE_SIZE});
    const total = data?.total || 0;

    const {mutate: deleteInspection} = useDeleteInspectionMutation({
        onMutate: () => spinner.show(),
        onSettled: () => spinner.hide(),
        onSuccess: () => refetch(),
    });

    useEffect(() => {
        if (!isFetching && data) setReports(data.items || []);
    }, [isFetching, data]);

    const handleDelete = (report: any) => {
        confirm.open({
            message: 'Are you sure you want to delete this report?',
            onConfirm: () => deleteInspection(report.id),
        });
    };

    return (
        <>
            <header className="dashboard-header">
                <div>
                    <h1 style={{fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.5px'}}>Inspections</h1>
                    <p style={{fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '2px'}}>
                        {total} inspections total
                    </p>
                </div>
                <div>
                    <Link href="/inspection">
                        <button className="flex items-center gap-2 bg-blue-600 rounded-sm px-4 py-2">
                            <Plus size={18}/>
                            <span className="text-sm text-nowrap">Add Inspection</span>
                        </button>
                    </Link>
                </div>
            </header>

            <section>
                {isFetching ? (
                    <div className="flex justify-center py-20 text-gray-500 text-sm">Loading...</div>
                ) : reports.length === 0 ? (
                    <div className="flex justify-center py-20 text-gray-500 text-sm">No inspections found</div>
                ) : (
                    <div className="property-grid">
                        {reports.map(report => (
                            <ReportCard report={report} onDelete={handleDelete} key={`report-${report.id}`}/>
                        ))}
                    </div>
                )}
                <CustomPagination total={total} current={page} pageSize={PAGE_SIZE}/>
            </section>
        </>
    );
}

export default function InspectionsPage() {
    return (
        <Suspense>
            <InspectionsContent/>
        </Suspense>
    );
}
