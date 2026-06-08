'use client';

import React, {useState} from "react";
import {App, Card} from "antd";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {useParams, useRouter} from "next/navigation";
import UserForm, {UserType} from "@/app/(backend)/admin/users/UserForm";
import {apiGet, apiPut} from "@/lib/backendApi";

export default function Page() {
    const params = useParams();
    const {message} = App.useApp();
    const {t} = useTranslations('users');
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [initvalValues, setInitvalValues] = useState<UserType>({});

    const handleSubmit = async (values: UserType) => {
        try {
            setSubmitting(true);
            await apiPut(`/users/${params.id}`, values);
            message.success(t('updateSuccess'));
            router.replace('/admin/users');
        } catch (e: unknown) {
            if (e instanceof Error) message.error(e.message || t('createError'));
        } finally {
            setSubmitting(false);
        }
    };

    React.useEffect(() => {
        (function () {
            apiGet(`/users/${params.id}`).then(response => {
                setInitvalValues({...response.data});
            }).catch(reason => {
                message.error(reason.message || t('fetchError'));
            }).finally(() => {
                setLoading(false);
            });
        })();
    }, [params.id]);

    return (
        <Card loading={loading} title={t('editUser')}>
            <UserForm
                initialValues={initvalValues}
                onSubmit={handleSubmit}
                submitting={submitting}
            />
        </Card>
    );
}
