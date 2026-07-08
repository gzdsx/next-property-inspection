'use client';

import {Suspense, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {Plus} from 'lucide-react';
import PropertyGrid from '@/components/frontend/PropertyGrid';
import CustomPagination from '@/components/frontend/CustomPagination';
import ModalProperty from '@/components/frontend/ModalProperty';
import {usePropertyListQuery} from '@/queries/property';

const PAGE_SIZE = 20;

function PropertiesContent() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [gridKey, setGridKey] = useState(0);

    const {data, isFetching, refetch} = usePropertyListQuery({page, limit: PAGE_SIZE});
    const properties = data?.items || [];
    const total = data?.total || 0;

    return (
        <>
            <header className="dashboard-header">
                <div>
                    <h1 style={{fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.5px'}}>Properties</h1>
                    <p style={{fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '2px'}}>
                        {total} properties total
                    </p>
                </div>
                <div>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 rounded-sm px-4 py-2"
                    >
                        <Plus size={18}/>
                        <span className="text-sm text-nowrap">Add Property</span>
                    </button>
                </div>
            </header>

            <section>
                {isFetching ? (
                    <div className="flex justify-center py-20 text-gray-500 text-sm">Loading...</div>
                ) : properties.length === 0 ? (
                    <div className="flex justify-center py-20 text-gray-500 text-sm">No properties found</div>
                ) : (
                    <PropertyGrid key={gridKey} properties={properties} onDelete={() => refetch()}/>
                )}
                <CustomPagination total={total} current={page} pageSize={PAGE_SIZE}/>
            </section>

            {isAddOpen && (
                <ModalProperty
                    onClose={() => setIsAddOpen(false)}
                    onSave={() => {
                        setIsAddOpen(false);
                        setGridKey(k => k + 1);
                        refetch();
                    }}
                />
            )}
        </>
    );
}

export default function PropertiesPage() {
    return (
        <Suspense>
            <PropertiesContent/>
        </Suspense>
    );
}
