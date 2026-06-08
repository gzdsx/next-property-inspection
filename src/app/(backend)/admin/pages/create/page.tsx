'use client';

import {PageForm, PageType} from "../PageForm";
import {App, Card} from "antd";
import {useState} from "react";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {apiPost} from "@/lib/backendApi";
import {useRouter} from "next/navigation";

export default function Page() {
    const [submitting, setSubmitting] = useState(false);
    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('pages');
    const router = useRouter();

    const handleSubmit = async (values: PageType) => {
        try {
            setSubmitting(true);
            const response = await apiPost(`/pages`, values);
            message.success(t('updateSuccess'));
            router.replace(`/admin/pages/${response.data.id}/edit`);
        } catch (error: unknown) {
            if (error instanceof Error) message.error(error?.message || tc('operationFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card title={t('addPage')} variant="borderless">
            <PageForm
                onSubmit={handleSubmit}
                submitting={submitting}
                initialValues={{
                    status: 'draft',
                    sort_num: 0,
                }}
            />
        </Card>
    );
}
