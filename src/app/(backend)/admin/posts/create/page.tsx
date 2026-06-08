'use client';

import React, {useState} from 'react';
import {App, Card} from "antd";
import {PostForm} from "../PostForm";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {apiPost} from "@/lib/backendApi";
import {useRouter} from "next/navigation";

interface PostType {
    title: string;
    slug: string;
    content: string;
    keywords: string;
    description: string;
    thumbnail: string;
    status: string;
    sort_num: number;
    categories: number[];
    author: string;
}

export default function Page() {
    const {t} = useTranslations('posts');
    const router = useRouter();
    const {message} = App.useApp();
    const [submiting, setSubmiting] = useState(false);

    const handleSubmit = async (values: PostType) => {
        try {
            setSubmiting(true);
            const response = await apiPost('/posts', values);
            router.replace(`/admin/posts/${response.data.id}/edit`);
        } catch (e: unknown) {
            if (e instanceof Error) {
                message.error(e.message);
            }
        } finally {
            setSubmiting(false)
        }
    }

    return (
        <Card title={t('addPost')}>
            <PostForm
                initialValues={{
                    title: '',
                    slug: '',
                    content: '',
                    keywords: '',
                    description: '',
                    thumbnail: '',
                    status: 'publish',
                    sort_num: 0,
                    categories: [],
                    author: '',
                }}
                submitting={submiting}
                onSubmit={handleSubmit}
            />
        </Card>
    );
}
