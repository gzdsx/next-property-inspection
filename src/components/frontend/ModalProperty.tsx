'use client';

import {useState} from "react";
import Autocomplete from "react-google-autocomplete";
import CloseIcon from "@/components/frontend/CloseIcon";
import NumberInput from "@/components/frontend/NumberInput";
import {apiPost, apiPut} from "@/lib/api";
import {Spinner} from "@/components/ui/spinner";

interface ModalPropertyProps {
    onClose: () => void;
    onSave: (property: any) => void;
    property?: any;
    editMode?: boolean;
}

const ModalProperty = ({onClose, onSave, property: defaultProperty, editMode}: ModalPropertyProps) => {
    const [property, setProperty] = useState<any>({
        type: 'Detached House',
        kitchen_type: 'standard',
        bedrooms: 1,
        main_bathrooms: 1,
        ensuite_bathrooms: 1,
        living_rooms: 1,
        floors: 2,
        ...defaultProperty
    });
    const [extractInfo, setExtractInfo] = useState<any>({
        hallway: false,
        outdoor: false,
        study: false,
        utility: false,
        guestWc: false,
        storage: false,
        ...defaultProperty?.includes
    });
    const [newPropertyImage, setNewPropertyImage] = useState(defaultProperty?.image || '');
    const [submiting, setSubmiting] = useState(false);

    const handleAddPropertySubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        // console.log({
        //     ...property,
        //     image: newPropertyImage,
        //     extract_info: {...extractInfo}
        // });

        if (editMode) {
            setSubmiting(true);
            apiPut(`/inspection/properties/${defaultProperty.id}`, {
                ...property,
                image: newPropertyImage,
                includes: {...extractInfo}
            }).then(response => {
                onSave(response.data);
                onClose();
            }).catch(reason => {

            }).finally(() => {
                setSubmiting(false);
            });
        } else {
            setSubmiting(true);
            apiPost(`/inspection/properties`, {
                ...property,
                image: newPropertyImage,
                includes: {...extractInfo}
            }).then(response => {
                onSave(response.data);
                onClose();
            }).catch(reason => {

            }).finally(() => {
                setSubmiting(false);
            });
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewPropertyImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()}
                 style={{maxWidth: "750px"}}>
                {/* Header */}
                <div style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid var(--panel-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: "1.2rem",
                        fontWeight: "bold"
                    }}>{editMode ? 'Edit Property' : 'Add Property'}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer"
                        }}
                    >
                        <CloseIcon/>
                    </button>
                </div>

                {/* Form */}
                <form method={'post'} onSubmit={handleAddPropertySubmit}
                      className={'flex flex-col flex-1 overflow-hidden'}>
                    <div style={{
                        padding: "24px",
                        overflowY: "auto",
                        flex: 1,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "24px"
                    }}>
                        {/* Left Column */}
                        <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                            <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                <label style={{
                                    fontSize: "0.8rem",
                                    fontWeight: "bold",
                                    color: "var(--text-muted)"
                                }}>Property Name/Address</label>
                                <Autocomplete
                                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                    onPlaceSelected={(place: any) => {
                                        setProperty((prev: any) => ({...prev, name: place.formatted_address}));
                                    }}
                                    options={{
                                        types: [],
                                        componentRestrictions: {country: ["ie", "gb"]}
                                    }}
                                    className="sheet-input"
                                    placeholder="e.g. 123 Main St, Belfast"
                                    defaultValue={property.name}
                                    onChange={(e: any) => {
                                        setProperty((prev: any) => ({...prev, name: e.target.value}));
                                    }}
                                    required
                                />
                            </div>

                            <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                <label className={'font-bold text-sm text-gray-500'}>Property Type</label>
                                <select
                                    className="sheet-select"
                                    value={property.type}
                                    onChange={(e) => {
                                        setProperty((prev: any) => ({...prev, type: e.target.value}));
                                    }}
                                >
                                    <option value="Detached House">Detached House (独立别墅)</option>
                                    <option value="Semi-Detached House">Semi-Detached House (半独立住宅)</option>
                                    <option value="Terraced House / Townhouse">Terraced House / Townhouse (联排别墅)
                                    </option>
                                    <option value="Apartment / Flat">Apartment / Flat (公寓/单元房)</option>
                                    <option value="Bungalow">Bungalow (平房/单层独栋)</option>
                                    <option value="Duplex / Maisonette">Duplex / Maisonette (复式住宅)</option>
                                    <option value="Standard HMO / Co-Living">Standard HMO / Co-Living
                                        (多人合租房/联合居住)
                                    </option>
                                    <option value="Commercial Property">Commercial Property (商业物业)</option>
                                </select>
                            </div>

                            <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                <label className={'font-bold text-sm text-gray-500'}>Property Image (Optional)</label>
                                <div style={{
                                    height: "120px",
                                    border: "2px dashed var(--panel-border)",
                                    borderRadius: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                    overflow: "hidden",
                                    backgroundColor: "rgba(255,255,255,0.01)"
                                }}>
                                    {newPropertyImage ? (
                                        <img src={newPropertyImage}
                                             style={{width: "100%", height: "100%", objectFit: "cover"}}/>
                                    ) : (
                                        <div style={{
                                            textAlign: "center",
                                            margin: "auto",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "6px"
                                        }}>
                                            <span style={{fontSize: "0.75rem", color: "var(--text-muted)"}}>Choose a cover image</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                style={{fontSize: "0.7rem", width: "180px"}}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column (Rooms) */}
                        <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                            <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                <label style={{
                                    fontSize: "0.8rem",
                                    fontWeight: "bold",
                                    color: "var(--text-muted)"
                                }}>Kitchen Type</label>
                                <div style={{display: "flex", gap: "10px"}}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProperty((prev: any) => ({...prev, kitchen_type: "standard"}));
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: "10px",
                                            borderRadius: "8px",
                                            border: "1px solid",
                                            cursor: "pointer",
                                            fontWeight: "bold",
                                            fontSize: "0.8rem",
                                            borderColor: property.kitchen_type === "standard" ? "var(--primary)" : "var(--panel-border)",
                                            backgroundColor: property.kitchen_type === "standard" ? "var(--primary-bg)" : "transparent",
                                            color: property.kitchen_type === "standard" ? "var(--primary)" : "var(--text-muted)"
                                        }}
                                    >
                                        Standard Kitchen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProperty((prev: any) => ({...prev, kitchen_type: "combo"}));
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: "10px",
                                            borderRadius: "8px",
                                            border: "1px solid",
                                            cursor: "pointer",
                                            fontWeight: "bold",
                                            fontSize: "0.8rem",
                                            borderColor: property.kitchen_type === "combo" ? "var(--primary)" : "var(--panel-border)",
                                            backgroundColor: property.kitchen_type === "combo" ? "var(--primary-bg)" : "transparent",
                                            color: property.kitchen_type === "combo" ? "var(--primary)" : "var(--text-muted)"
                                        }}
                                    >
                                        Kitchen/Living Combo
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "14px",
                                borderBottom: "1px solid var(--panel-border)",
                                paddingBottom: "14px"
                            }}>
                                {/* Bedrooms Count */}
                                <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                    <label style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        color: "var(--text-muted)"
                                    }}>Bedrooms</label>
                                    <NumberInput value={property.bedrooms || 1} onChange={(value) => {
                                        setProperty((prev: any) => ({...prev, bedrooms: value}));
                                    }}/>
                                </div>

                                {/* Bathrooms Count */}
                                <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                    <label style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        color: "var(--text-muted)"
                                    }}>Main Bathrooms</label>
                                    <NumberInput value={property.main_bathrooms || 1} onChange={(value) => {
                                        setProperty((prev: any) => ({...prev, main_bathrooms: value}));
                                    }}/>
                                </div>

                                {/* Ensuite Count */}
                                <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                    <label style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        color: "var(--text-muted)"
                                    }}>Ensuite Bathrooms</label>
                                    <NumberInput
                                        value={property.ensuite_bathrooms || 0}
                                        min={0}
                                        max={10}
                                        onChange={(value) => {
                                            setProperty((prev: any) => ({...prev, ensuite_bathrooms: value}));
                                        }}
                                    />
                                </div>

                                {/* Living Rooms Count */}
                                <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                    <label style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        color: "var(--text-muted)"
                                    }}>Living/Sitting Rooms</label>
                                    <NumberInput value={property.living_rooms || 1} onChange={(value) => {
                                        setProperty((prev: any) => ({...prev, living_rooms: value}));
                                    }}/>
                                </div>

                                {/* Storeys Count */}
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                    gridColumn: "span 2"
                                }}>
                                    <label style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        color: "var(--text-muted)"
                                    }}>Floors / Storeys</label>
                                    <NumberInput value={property.floors || 1} onChange={(value) => {
                                        setProperty((prev: any) => ({...prev, floors: value}));
                                    }}/>
                                </div>
                            </div>

                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                                paddingTop: "4px"
                            }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div>
                                        <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Hallway &
                                            Landing Included</p>
                                        <p style={{
                                            margin: 0,
                                            fontSize: "0.7rem",
                                            color: "var(--text-muted)"
                                        }}>Entrance halls, stairs, floor landings</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={extractInfo.hallway}
                                        onChange={(e) => {
                                            setExtractInfo((prev: any) => ({...prev, hallway: e.target.checked}));
                                        }}
                                        style={{width: "18px", height: "18px"}}
                                    />
                                </div>

                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div>
                                        <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Study / Office
                                            Included</p>
                                        <p style={{
                                            margin: 0,
                                            fontSize: "0.7rem",
                                            color: "var(--text-muted)"
                                        }}>Home office or dedicated library space</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={extractInfo.study}
                                        onChange={(e) => {
                                            setExtractInfo((prev: any) => ({...prev, study: e.target.checked}));
                                        }}
                                        style={{width: "18px", height: "18px"}}
                                    />
                                </div>

                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div>
                                        <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Utility /
                                            Laundry Room Included</p>
                                        <p style={{
                                            margin: 0,
                                            fontSize: "0.7rem",
                                            color: "var(--text-muted)"
                                        }}>Dedicated washing and utility space</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={extractInfo.utility}
                                        onChange={(e) => {
                                            setExtractInfo((prev: any) => ({...prev, utility: e.target.checked}));
                                        }}
                                        style={{width: "18px", height: "18px"}}
                                    />
                                </div>

                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div>
                                        <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Guest WC
                                            Included</p>
                                        <p style={{
                                            margin: 0,
                                            fontSize: "0.7rem",
                                            color: "var(--text-muted)"
                                        }}>Downstairs toilet/washroom</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={extractInfo.guestWc}
                                        onChange={(e) => {
                                            setExtractInfo((prev: any) => ({...prev, guestWc: e.target.checked}));
                                        }}
                                        style={{width: "18px", height: "18px"}}
                                    />
                                </div>

                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div>
                                        <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>HP / Storage
                                            Closets Included</p>
                                        <p style={{
                                            margin: 0,
                                            fontSize: "0.7rem",
                                            color: "var(--text-muted)"
                                        }}>Hot press, linen closet, built-in storage</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={extractInfo.storage}
                                        onChange={(e) => {
                                            setExtractInfo((prev: any) => ({...prev, storage: e.target.checked}));
                                        }}
                                        style={{width: "18px", height: "18px"}}
                                    />
                                </div>

                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div>
                                        <p style={{margin: 0, fontSize: "0.85rem", fontWeight: "bold"}}>Outdoor
                                            Area Included</p>
                                        <p style={{
                                            margin: 0,
                                            fontSize: "0.7rem",
                                            color: "var(--text-muted)"
                                        }}>Garden, patio, driveway</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={extractInfo.outdoor}
                                        onChange={(e) => {
                                            setExtractInfo((prev: any) => ({...prev, outdoor: e.target.checked}));
                                        }}
                                        style={{width: "18px", height: "18px"}}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: "16px 24px",
                        borderTop: "1px solid var(--panel-border)",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px"
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="sheet-select"
                            style={{padding: "10px 20px"}}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: "0 24px", backgroundColor: "var(--primary)", border: "none",
                                borderRadius: "8px", color: "white", fontWeight: "bold", cursor: "pointer",
                                height: "38px",
                                opacity: submiting ? 0.5 : 1
                            }}
                            disabled={submiting}
                        >
                            {submiting ? <Spinner/> : "Save Property"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModalProperty;