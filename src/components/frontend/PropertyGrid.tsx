'use client';

import {Property} from "@/types";
import PropertyCard from "@/components/frontend/PropertyCard";

interface PropertyGridProps {
    properties: Property[];
    onDelete?: (property: Property) => void;
}

const PropertyGrid = ({properties = [], onDelete}: PropertyGridProps) => {
    return (
        <div className="property-grid">
            {properties.map((propety) => (
                <PropertyCard property={propety} onDelete={onDelete} key={`property-${propety.id}`}/>
            ))}
        </div>
    );
};

export default PropertyGrid;