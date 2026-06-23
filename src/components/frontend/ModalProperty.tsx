'use client';

import {useState} from "react";
import Autocomplete from "react-google-autocomplete";
import CloseIcon from "@/components/frontend/CloseIcon";
import NumberInput from "@/components/frontend/NumberInput";
import {Spinner} from "@/components/ui/spinner";
import {useCreatePropertyMutation, useUpdatePropertyMutation} from "@/queries/property";
import {Property} from "@/types";
import {toast} from "sonner";
import {useMediaPicker} from "@/contexts/AppContext";
import {Camera, X} from "lucide-react";

interface ModalPropertyProps {
    onClose: () => void;
    onSave: (property: any) => void;
    property?: any;
    editMode?: boolean;
}

const ModalProperty = ({onClose, onSave, property: defaultProperty, editMode}: ModalPropertyProps) => {
    const mediaPicker = useMediaPicker();
    const [property, setProperty] = useState<Property>({
        type: 'Detached House',
        kitchen_type: 'standard',
        bedrooms: 1,
        main_bathrooms: 1,
        ensuite_bathrooms: 1,
        living_rooms: 1,
        storeys: 2,
        ...defaultProperty
    });
    const [rooms, setRooms] = useState<string[]>(Array.isArray(defaultProperty?.rooms) ? defaultProperty?.rooms : []);
    const [submiting, setSubmiting] = useState(false);

    const {mutate: createProperty} = useCreatePropertyMutation({
        onMutate: () => setSubmiting(true),
        onSettled: () => setSubmiting(false),
        onSuccess: (data: any) => {
            onSave(data);
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    const {mutate: updateProperty} = useUpdatePropertyMutation({
        onMutate: () => setSubmiting(true),
        onSettled: () => setSubmiting(false),
        onSuccess: (data: any) => {
            onSave(data);
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    const handleAddPropertySubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        const payload = {...property, rooms};
        if (editMode) {
            updateProperty({id: defaultProperty.id, data: payload} as any);
        } else {
            createProperty(payload as any);
        }
    };

    const handlePickImage = () => {
        mediaPicker.open({
            onSelect: (items) => {
                if (items.length > 0) {
                    setProperty(prev => ({...prev, image: items[0].src || items[0].thumbnail}));
                }
            },
        });
    };

    const handleSelectedRoom = (room: string) => {
        if (rooms.includes(room)) {
            setRooms(prev => prev.filter(r => r !== room));
        } else {
            setRooms(prev => [...new Set([...prev, room])]);
        }
    };

    const kitchenBtn = (type: string, label: string) => (
        <button
            type="button"
            onClick={() => setProperty(prev => ({...prev, kitchen_type: type}))}
            className={`flex-1 py-2.5 rounded-lg border font-bold text-[0.8rem] cursor-pointer transition-colors
                ${property.kitchen_type === type
                ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                : 'border-white/10 bg-transparent text-gray-500 hover:border-white/20'
            }`}
        >
            {label}
        </button>
    );

    const roomToggle = (key: string, title: string, desc: string) => (
        <div className="flex justify-between items-center">
            <div>
                <p className="m-0 text-[0.85rem] font-bold">{title}</p>
                <p className="m-0 text-[0.7rem] text-gray-500">{desc}</p>
            </div>
            <input
                type="checkbox"
                checked={rooms.includes(key)}
                onChange={() => handleSelectedRoom(key)}
                className="w-[18px] h-[18px]"
            />
        </div>
    );

    return (
        <div className="modal-backdrop z-100!" onClick={onClose}>
            <div className="glass-panel modal-card max-w-187.5" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/8 flex justify-between items-center">
                    <h3 className="m-0 text-xl font-bold">
                        {editMode ? 'Edit Property' : 'Add Property'}
                    </h3>
                    <button onClick={onClose} className="bg-transparent border-none text-gray-500 cursor-pointer">
                        <CloseIcon/>
                    </button>
                </div>

                {/* Form */}
                <form method="post" onSubmit={handleAddPropertySubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="flex flex-col gap-4">
                            {/* Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500">Property Name/Address</label>
                                <Autocomplete
                                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                    onPlaceSelected={(place: any) => {
                                        setProperty(prev => ({...prev, name: place.formatted_address}));
                                    }}
                                    options={{types: [], componentRestrictions: {country: ["ie", "gb"]}}}
                                    className="sheet-input"
                                    placeholder="e.g. 123 Main St, Belfast"
                                    defaultValue={property.name}
                                    onChange={(e: any) => setProperty(prev => ({...prev, name: e.target.value}))}
                                    required
                                />
                            </div>

                            {/* Type */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500">Property Type</label>
                                <select
                                    className="sheet-select"
                                    value={property.type || 'Detached House'}
                                    onChange={e => setProperty(prev => ({...prev, type: e.target.value}))}
                                >
                                    <option value="Detached House">Detached House</option>
                                    <option value="Semi-Detached House">Semi-Detached House</option>
                                    <option value="Terraced House / Townhouse">Terraced House / Townhouse</option>
                                    <option value="Apartment / Flat">Apartment / Flat</option>
                                    <option value="Bungalow">Bungalow</option>
                                    <option value="Duplex / Maisonette">Duplex / Maisonette</option>
                                    <option value="Standard HMO / Co-Living">Standard HMO / Co-Living</option>
                                    <option value="Commercial Property">Commercial Property</option>
                                </select>
                            </div>

                            {/* Image */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500">Property Image (Optional)</label>
                                <div
                                    onClick={handlePickImage}
                                    className="relative aspect-4/3 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center overflow-hidden bg-white/[0.01] cursor-pointer hover:border-blue-500/40 transition-colors group"
                                >
                                    {property.image ? (
                                        <>
                                            <img src={property.image} className="w-full h-full object-cover" alt=""/>
                                            <div
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera size={24} className="text-white"/>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setProperty(prevState => ({...prevState, image: ''}));
                                                }}
                                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 border-none flex items-center justify-center cursor-pointer text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={14}/>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 text-gray-500">
                                            <Camera size={24}/>
                                            <span className="text-xs">Choose from library</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="flex flex-col gap-4">
                            {/* Kitchen Type */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500">Kitchen Type</label>
                                <div className="flex gap-2.5">
                                    {kitchenBtn('standard', 'Standard Kitchen')}
                                    {kitchenBtn('combo', 'Kitchen/Living Combo')}
                                </div>
                            </div>

                            {/* Room counts */}
                            <div className="grid grid-cols-2 gap-3.5 border-b border-white/8 pb-3.5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-500">Bedrooms</label>
                                    <NumberInput value={property.bedrooms || 1}
                                                 onChange={v => setProperty(prev => ({...prev, bedrooms: v}))}/>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-500">Main Bathrooms</label>
                                    <NumberInput value={property.main_bathrooms || 1}
                                                 onChange={v => setProperty(prev => ({...prev, main_bathrooms: v}))}/>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-500">Ensuite Bathrooms</label>
                                    <NumberInput value={property.ensuite_bathrooms || 0} min={0} max={10}
                                                 onChange={v => setProperty(prev => ({
                                                     ...prev,
                                                     ensuite_bathrooms: v
                                                 }))}/>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-500">Living/Sitting Rooms</label>
                                    <NumberInput value={property.living_rooms || 1}
                                                 onChange={v => setProperty(prev => ({...prev, living_rooms: v}))}/>
                                </div>
                                <div className="flex flex-col gap-1.5 col-span-2">
                                    <label className="text-xs font-bold text-gray-500">Floors / Storeys</label>
                                    <NumberInput value={property.storeys || 1}
                                                 onChange={v => setProperty(prev => ({...prev, storeys: v}))}/>
                                </div>
                            </div>

                            {/* Room toggles */}
                            <div className="flex flex-col gap-3 pt-1">
                                {roomToggle('hallway', 'Hallway & Landing Included', 'Entrance halls, stairs, floor landings')}
                                {roomToggle('study', 'Study / Office Included', 'Home office or dedicated library space')}
                                {roomToggle('utility', 'Utility / Laundry Room Included', 'Dedicated washing and utility space')}
                                {roomToggle('guestWc', 'Guest WC Included', 'Downstairs toilet/washroom')}
                                {roomToggle('storage', 'HP / Storage Closets Included', 'Hot press, linen closet, built-in storage')}
                                {roomToggle('outdoor', 'Outdoor Area Included', 'Garden, patio, driveway')}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="sheet-select px-5 py-2.5">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submiting}
                            className="px-6 h-[38px] bg-blue-500 border-none rounded-lg text-white font-bold cursor-pointer disabled:opacity-50"
                        >
                            {submiting ? <Spinner/> : 'Save Property'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModalProperty;
