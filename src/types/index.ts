export type Company = {
    id: number;
    name: string;
    logo: string;
    address: string;
    telephone: string;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

export type Property = {
    id: number;
    name: string;
    type: string;
    image: string;
    kitchen_type: string;
    bedrooms: number;
    main_bathrooms: number;
    ensuite_bathrooms: number;
    living_rooms: number;
    floors: number;
    storeys: number;
    rooms: any[];
    address_line_1: string;
    address_line_2: string;
    postcode: string;
    city: string;
    state: string;
    country: string;
    views: string;
    last_updated_at: string;
    [key: string]: any;
}

export type Inspection = {
    id: number;
    property_id: number;
    type: string;
    status: string;
    subtext: string;
    signature: string;
    image: string;
    views: number;
    room_images: any[];
    pdf_url: string;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

export type InspectionVideo = {
    id: number;
    title: string;
    src: string;
    mime_type: string;
    status: string;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

export type InsoectionItem = {
    id: number;
    video_id: number;
    room_name: string;
    item_name: string;
    description: string;
    condition: string;
    severity: string;
    elapsed_seconds: number;
    image: string;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}