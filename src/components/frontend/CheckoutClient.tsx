'use client';

import React, {useState} from 'react';
import {useSession} from 'next-auth/react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Loader2, CheckCircle2} from 'lucide-react';
import {toast} from 'sonner';
import {useCart} from '@/contexts/CartContext';
import {useTranslations} from '@/contexts/LocaleContext';
import {apiPost} from '@/lib/api';
import CheckoutForm from '@/components/frontend/CheckoutForm';
import CartSummary from '@/components/frontend/CartSummary';
import Link from 'next/link';

export default function CheckoutClient() {
    const {data: session, status} = useSession();
    const router = useRouter();
    const {items, totalPrice, clearCart} = useCart();
    const {t} = useTranslations('ecommerce');
    const [submitting, setSubmitting] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);

    if (status === 'loading') {
        return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
    }

    if (!session) {
        router.push('/login?callbackUrl=/checkout');
        return null;
    }

    if (items.length === 0 && !orderPlaced) {
        router.push('/cart');
        return null;
    }

    const handleSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            const orderData = {
                shipping: {
                    name: values.name,
                    phone_number: values.phone_number,
                    address: values.address,
                    city: values.city,
                    postal_code: values.postal_code,
                },
                items: items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,
                    sku_id: item.sku_id,
                    sku_name: item.sku_name,
                    title: item.title,
                    thumbnail: item.thumbnail
                })),
                total: totalPrice,
                payment_method: values.payment_method,
            };
            await apiPost('/orders', orderData);
            clearCart();
            setOrderPlaced(true);
        } catch (e: unknown) {
            console.error(e);
            if (e instanceof Error) {
                toast.error(e.message || t('createError'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (orderPlaced) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="text-center">
                    <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4"/>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('checkout.orderPlaced')}</h2>
                    <p className="text-gray-500 mb-8">{t('checkout.orderPlacedSubtitle')}</p>
                    <div className="flex justify-center gap-4">
                        <Link href="/user/orders">
                            <Button>{t('header.myOrders')}</Button>
                        </Link>
                        <Link href="/">
                            <Button variant="outline">{t('checkout.backToHome')}</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('checkout.title')}</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <CheckoutForm onSubmit={handleSubmit} submitting={submitting}/>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-20">
                        <CartSummary showCheckoutButton={false}/>
                    </div>
                </div>
            </div>
        </div>
    );
}
