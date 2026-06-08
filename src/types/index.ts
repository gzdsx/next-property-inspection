export interface Category {
    id: number;
    name: string;
    slug: string;
    thumbnail: string;
    children: Category[];
    products?: Product[];
}

export interface SkuItem {
    id?: number,
    name: string;
    price: number;
    stock: number;
    properties: string;
}

export interface ImageItem {
    src: string;
    alt: string;
}

export interface VariantOptionItem {
    title: string;
    price: number;
    selected: boolean;
}

export interface VariantItem {
    name: string;
    options: VariantOptionItem[]
}

export interface Product {
    id: number;
    title: string;
    slug: string;
    description: string;
    content: string;
    thumbnail: string;
    price: number;
    original_price: number;
    status: string;
    icon?: string;
    sold?: number;
    points?: number;
    images?: ImageItem[];
    skus?: SkuItem[];
    categories?: { id: number; name: string }[];
    keywords?: string;
    has_sku_attr?: boolean;
    variants?: VariantItem[];
    additional_options?: VariantOptionItem[],
    variation_list?: VariantItem[];
    meta_data?: Record<string, any>;
    allow_point_purchase?: boolean;
    point_price?: number;
    metas?: Record<string, any>[];
}

export interface CartOptionItem {
    name: string;
    price: number;
    value?: string;
}

export interface CartItem {
    id?: number;
    product_id: number;
    product_type: string;
    quantity: number;
    title?: string;
    price: number;
    image?: string;
    sku_id?: number;
    sku_name?: string;
    options?: CartOptionItem[];
    additional_options?: CartOptionItem[];
    purchase_via?: string;
}

export interface ShippingAddress {
    name: string;
    iddcode: string;
    phone_number: string;
    address: string;
    eircode: string;
}

export interface ShippingZone {
    id: number;
    title: string;
    fee: number;
}

export interface ShippingAddress {
    name: string;
    iddcode: string;
    phone_number: string;
    address: string;
    eircode: string;
}

export interface Order {
    id: number;
    order_no: string;
    status: string;
    total: string;
    items: OrderItem[];
    created_at: string;
    updated_at: string;
    shipping_total: string;
    is_modified?: boolean;
    shipping: ShippingAddress;
    payment_method_title?: string;
    is_paid?: boolean;
    deliveryer?: {
        name: string;
        color: string;
    },
    short_code?: string;
    buyer_name?: string;
    shipping_method_title?: string;
    links?: Record<string, { href: string, rel: string }>;
    payment_at?: string;
    shipping_method?: string;
    deliveryer_id?: number;
    shipping_zone?: string;
    payment_type?: string;
    payment_method?: string;
    cost_total?: string;
    payment_fee?: string;
    metas?: Record<string, any>[];
    deleted_at?: string;
    printed_at?: string;
    is_printed?: boolean;
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;
    product_type: string;
    quantity: number;
    title?: string;
    price: number;
    image?: string;
    sku_id?: number;
    sku_name?: string;
    options?: CartOptionItem[];
    variations?: CartOptionItem[] | Record<string, any>;
    additional_options?: CartOptionItem[];
    comments?: { type: string, name: string }[];
    purchase_via?: string;
}