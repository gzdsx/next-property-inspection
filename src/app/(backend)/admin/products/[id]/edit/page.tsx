'use client';

import {useState, useEffect} from 'react';
import {Card, App} from 'antd';
import {useParams} from 'next/navigation';
import {apiGet, apiPut} from '@/lib/backendApi';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import {ProductForm, ProductType} from "@/app/(backend)/admin/products/ProductForm";

interface CategoryType {
    id: number;
    name: string;
}

export default function ProductEditPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [initialValues, setInitialValues] = useState<ProductType>({
        title: '',
        description: '',
        content: '',
        thumbnail: '',
        price: 0,
        has_sku_attr: false,
        attr_list: [],
        icon: "",
        id: 0,
        keywords: "",
        points: 0,
        regular_price: 0,
        sold: 0,
        stock: 0,
        status: 'publish',
        sort_num: 0,
        categories: [],
        images: [],
        skus: []
    });

    const {message} = App.useApp();
    const {t} = useTranslations('products');

    useEffect(() => {
        (async () => {
            try {
                const response = await apiGet(`/products/${params.id}`);
                const data = response.data;
                setInitialValues((prevState) => ({
                    ...prevState,
                    ...data,
                    title: data.title,
                    slug: data.slug,
                    description: data.description,
                    content: data.content,
                    thumbnail: data.thumbnail,
                    price: data.price,
                    original_price: data.original_price,
                    status: data.status,
                    sort_num: data.sort_num,
                    categories: data.categories?.map((item: CategoryType) => item.id.toString()) ?? [],
                    images: data.images ?? [],
                    skus: data.skus ?? [],
                }));
            } catch {
                message.error(t('fetchError'));
            } finally {
                setLoading(false);
            }
        })();
    }, [params.id]);

    const handleSubmit = async (values: ProductType) => {
        try {
            setSubmitting(true);
            await apiPut(`/products/${params.id}`, values);
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
        <Card title={t('editProduct')} variant="borderless" loading={loading}>
            <ProductForm
                initialValues={initialValues}
                submitting={submitting}
                onSubmit={handleSubmit}
            />
        </Card>
    );
}
