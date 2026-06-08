'use client';

import React, {useState, useCallback} from 'react';
import Link from 'next/link';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Loader2} from 'lucide-react';
import {ShoppingCart, Zap} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from '@/contexts/LocaleContext';
import {useCart} from '@/contexts/CartContext';
import ProductImageGallery from '@/components/frontend/ProductImageGallery';
import VariantSelector from '@/components/frontend/VariantSelector';

interface SkuItem {
    id?: number,
    name: string;
    price: number;
    stock: number;
    properties: string;
}

interface ImageItem {
    src: string;
    alt: string;
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
    images?: ImageItem[];
    skus?: SkuItem[];
    categories?: { id: number; name: string }[];
    keywords?: string;
    has_sku_attr?: boolean;
    variants?: { name: string; options: { title: string; price?: number }[] }[];
}

interface ProductDetailClientProps {
    product: Product;
}

export default function ProductDetailClient({product}: ProductDetailClientProps) {
    const {t} = useTranslations('ecommerce');
    const {addItem} = useCart();
    const [quantity, setQuantity] = useState(1);
    const [selectedSku, setSelectedSku] = useState<SkuItem | null>(null);

    const handleSkuChange = useCallback((sku: SkuItem | null) => {
        console.log('Selected SKU:', sku);
        setSelectedSku(sku);
    }, []);

    const currentPrice = selectedSku?.price ?? product.price;
    const currentStock = selectedSku?.stock ?? 999;
    const isOutOfStock = currentStock <= 0;

    const handleAddToCart = () => {
        if (product.skus?.length && !selectedSku) {
            toast.error('请选择产品规格');
            return false;
        }
        addItem({
            product_id: product.id,
            title: product.title,
            thumbnail: product.thumbnail,
            price: currentPrice,
            quantity,
            sku_id: selectedSku?.id,
            sku_name: selectedSku?.name,
        });
        toast.success(t('product.addToCart') + ' ✓');
    };

    const handleBuyNow = () => {
        handleAddToCart();
        window.location.href = '/cart';
    };

    const hasDiscount = product.original_price && product.original_price > currentPrice;
    const discountPercent = hasDiscount
        ? Math.round((1 - currentPrice / product.original_price) * 100)
        : 0;

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <Breadcrumb className="mb-6">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">{t('header.home')}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/products">{t('header.products')}</BreadcrumbLink>
                    </BreadcrumbItem>
                    {product.categories?.length ? (
                        <>
                            <BreadcrumbSeparator/>
                            <BreadcrumbItem>
                                <BreadcrumbPage>{product.categories[0].name}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </>
                    ) : null}
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{product.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ProductImageGallery images={product.images} title={product.title}/>

                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.title}</h1>
                        {product.icon && <Badge variant="destructive" className="text-sm">{product.icon}</Badge>}
                    </div>

                    <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-bold text-red-500">¥{currentPrice}</span>
                            {hasDiscount && (
                                <>
                                    <span
                                        className="text-lg text-gray-400 line-through">¥{product.original_price}</span>
                                    <Badge variant="destructive">-{discountPercent}%</Badge>
                                </>
                            )}
                        </div>
                        <span className="text-sm text-gray-500 mt-1 block">{t('product.sold')} {product.sold}</span>
                    </div>

                    {product.has_sku_attr && (
                        <VariantSelector
                            variants={product.variants || []}
                            skus={product.skus || []}
                            onSkuChange={handleSkuChange}
                        />
                    )}

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">{t('product.quantity')}:</span>
                        <Input
                            type="number"
                            min={1}
                            max={currentStock}
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                            className="w-24 h-9 text-center"
                        />
                        <span className="text-sm text-gray-400">
                            {isOutOfStock ? t('product.outOfStock') : t('product.inStock')}
                        </span>
                    </div>

                    <div className="flex gap-3">
                        <Button size="lg"
                                onClick={handleAddToCart}
                                disabled={isOutOfStock}
                                className="flex-1 h-12 text-base">
                            <ShoppingCart size={18} className="mr-2"/>
                            {t('product.addToCart')}
                        </Button>
                        <Button size="lg"
                                onClick={handleBuyNow}
                                disabled={isOutOfStock}
                                className="flex-1 h-12 text-base bg-orange-500 text-white hover:bg-orange-600">
                            <Zap size={18} className="mr-2"/>
                            {t('product.buyNow')}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-12">
                <Tabs defaultValue="description">
                    <TabsList>
                        <TabsTrigger value="description">{t('product.description')}</TabsTrigger>
                        <TabsTrigger value="specs">{t('product.specs')}</TabsTrigger>
                        <TabsTrigger value="reviews">{t('product.reviews')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="description">
                        <div className="prose prose-sm max-w-none"
                             dangerouslySetInnerHTML={{__html: product.content || `<p>${t('product.noDescription')}</p>`}}/>
                    </TabsContent>
                    <TabsContent value="specs">
                        <div className="text-sm text-gray-600 space-y-2">
                            {product.description && <p>{product.description}</p>}
                            {selectedSku && (
                                <div className="mt-4">
                                    <p className="font-medium">SKU: {selectedSku.name}</p>
                                    <p>{t('product.stock')}: {selectedSku.stock}</p>
                                </div>
                            )}
                            {product.keywords?.length ? (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {product.keywords.split(',').map(kw => (
                                        <Badge key={kw} variant="secondary">{kw}</Badge>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </TabsContent>
                    <TabsContent value="reviews">
                        <div className="text-center py-12 text-gray-400">{t('product.noReviews')}</div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
