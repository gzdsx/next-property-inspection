'use client';

import React, {useState} from 'react';
import {App, Card} from 'antd';
import {useRouter} from 'next/navigation';
import {apiPost} from '@/lib/backendApi';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import UserForm, {UserType} from "../UserForm";

export default function Page() {
    const {message} = App.useApp();
    const {t} = useTranslations('users');
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (values: UserType) => {
        try {
            setSubmitting(true);
            await apiPost('/users', values);
            message.success(t('createSuccess'));
            router.replace('/admin/users');
        } catch (e: unknown) {
            if (e instanceof Error) message.error(e.message || t('createError'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card title={t('addUser')}>
            <UserForm
                initialValues={{
                    status: 'active',
                    role_id: 2
                }}
                onSubmit={handleSubmit}
                submitting={submitting}
            />
        </Card>
    );
}
