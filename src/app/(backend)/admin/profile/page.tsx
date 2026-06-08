'use client';

import React, {useState} from 'react';
import {App, Card} from "antd";
import UserForm, {UserType} from "../users/UserForm";
import {apiGet, apiPost} from "@/lib/backendApi";
import {useTranslations} from '@/contexts/BackendLocaleContext';

export default function Page() {
    const [user, setUser] = useState<UserType>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('users');

    const handleSubmit = async (values: UserType) => {
        try {
            setSubmitting(true);
            await apiPost('/profile', values);
            message.success(t('updateSuccess'));
        } catch (e: unknown) {
            if (e instanceof Error) message.error(e.message || t('createError'));
        } finally {
            setSubmitting(false);
        }
    };

    React.useEffect(() => {
        (function () {
            apiGet('/profile').then(res => {
                setUser(res.data)
            }).finally(() => {
                setLoading(false)
            });
        })()
    }, [])
    return (
        <Card loading={loading} title={tc('editProfile')}>
            <UserForm
                initialValues={user}
                submitting={submitting}
                onSubmit={handleSubmit}
            />
        </Card>
    )
}
