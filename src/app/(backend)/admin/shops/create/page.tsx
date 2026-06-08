'use client';

import React, {useState} from 'react';
import {App, Card} from "antd";
import {ShopForm} from "../ShopForm";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {apiPost} from "@/lib/backendApi";
import {useRouter} from "next/navigation";

interface ShopType {
    name: string;
    address: string;
    phone: string;
    status: string;
    description: string;
    longitude: number;
    latitude: number;
    business_hours: string;
    cover: string;
    manager: string;
    sort_num: number;
}

export default function Page() {
    const {t} = useTranslations('shops');
    const router = useRouter();
    const {message} = App.useApp();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (values: ShopType) => {
        try {
            setSubmitting(true);
            const response = await apiPost('/shops', values);
            router.replace(`/admin/shops/${response.data.id}/edit`);
        } catch (e: unknown) {
            if (e instanceof Error) {
                message.error(e.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card title={t('addShop')}>
            <ShopForm
                initialValues={{
                    name: '',
                    address: '',
                    phone: '',
                    description: '',
                    longitude: 0,
                    latitude: 0,
                    business_hours: '',
                    cover: '',
                    manager: '',
                    status: 'open',
                    sort_num: 0,
                }}
                submitting={submitting}
                onSubmit={handleSubmit}
            />
        </Card>
    );
}
