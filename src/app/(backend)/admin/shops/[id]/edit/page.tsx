'use client';

import {useState, useEffect} from 'react';
import {Card, App} from 'antd';
import {useParams} from 'next/navigation';
import {apiGet, apiPut} from '@/lib/backendApi';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import {ShopForm} from "@/app/(backend)/admin/shops/ShopForm";

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

export default function ShopEditPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [initialValues, setInitialValues] = useState<ShopType>({
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
    });

    const {message} = App.useApp();
    const {t} = useTranslations('shops');

    useEffect(() => {
        (async () => {
            try {
                const response = await apiGet(`/shops/${params.id}`);
                const data = response.data;
                setInitialValues((prevState) => ({
                    ...prevState,
                    name: data.name,
                    address: data.address,
                    phone: data.phone,
                    description: data.description,
                    longitude: data.longitude,
                    latitude: data.latitude,
                    business_hours: data.business_hours,
                    cover: data.cover,
                    manager: data.manager,
                    status: data.status,
                    sort_num: data.sort_num,
                }));
            } catch (error) {
                message.error(t('fetchError'));
            } finally {
                setLoading(false);
            }
        })();
    }, [params.id]);

    const handleSubmit = async (values: ShopType) => {
        const postData: ShopType = {
            name: values.name,
            address: values.address,
            phone: values.phone,
            description: values.description,
            longitude: values.longitude,
            latitude: values.latitude,
            business_hours: values.business_hours,
            cover: values.cover,
            manager: values.manager,
            status: values.status,
            sort_num: values.sort_num,
        };
        try {
            setSubmitting(true);
            await apiPut(`/shops/${params.id}`, postData);
            message.success(t('updateSuccess'));
        } catch (error: unknown) {
            if (error instanceof Error) {
                message.error(error.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card title={t('editShop')} variant="borderless" loading={loading}>
            <ShopForm
                initialValues={initialValues}
                submitting={submitting}
                onSubmit={handleSubmit}
            />
        </Card>
    );
}
