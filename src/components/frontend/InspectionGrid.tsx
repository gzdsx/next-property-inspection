'use client';

import InspectionCard from "@/components/frontend/InspectionCard";

interface InspectionGridProps {
    data: any[];
    onDeleted?: (report: any) => void;
}

const InspectionGrid = ({data,onDeleted}: InspectionGridProps) => {
    return (
        <div className={'property-grid'}>
            {data.map((item, index) => (
                <InspectionCard inspection={item} key={`inspection-card-${item.id}`} onDeleted={onDeleted} />
            ))}
        </div>
    );
};

export default InspectionGrid;