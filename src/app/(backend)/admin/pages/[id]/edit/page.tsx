'use client';

import {useState, useEffect} from 'react';
import {Card, App} from 'antd';
import {useParams} from 'next/navigation';
import {apiGet, apiPut} from '@/lib/backendApi';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import {PageForm, PageType} from "../../PageForm";

export default function PageEditPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [initValues, setInitValues] = useState<PageType>({});

    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('pages');

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const response = await apiGet(`/pages/${params.id}`);
                setInitValues({...response.data});
            } catch (error) {
                message.error(t('fetchError'));
            } finally {
                setLoading(false);
            }
        })();
    }, [params.id]);

    const handleSubmit = async (values: PageType) => {
        try {
            setSubmitting(true);
            await apiPut(`/pages/${params.id}`, values);
            message.success(t('updateSuccess'));
        } catch (error: any) {
            message.error(error?.message || tc('operationFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card title={t('editPage')} variant="borderless" loading={loading}>
            <PageForm
                initialValues={initValues}
                onSubmit={handleSubmit}
                submitting={submitting}
            />
        </Card>
    );
}
