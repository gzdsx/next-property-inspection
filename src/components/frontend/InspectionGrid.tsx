'use client';

import InspectionCard from "@/components/frontend/InspectionCard";

interface InspectionGridProps {
    data: any[];
    onDeleted?: (report: any) => void;
}

const InspectionGrid = ({data,onDeleted}: InspectionGridProps) => {
    return (
        <div className={'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6'}>
            {data.map((item, index) => (
                <InspectionCard inspection={item} key={`inspection-card-${item.id}`} onDeleted={onDeleted} />
            ))}
        </div>
    );
};

export default InspectionGrid;