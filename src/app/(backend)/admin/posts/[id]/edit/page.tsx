'use client';

import {useState, useEffect} from 'react';
import {Card, App} from 'antd';
import {useParams} from 'next/navigation';
import {apiGet, apiPut} from '@/lib/backendApi';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import {PostForm} from "@/app/(backend)/admin/posts/PostForm";

interface CategoryType {
    id: number;
    name: string;
}

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

export default function PostEditPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [initvalValues, setInitvalValues] = useState<PostType>({
        title: '',
        slug: '',
        content: '',
        keywords: '',
        description: '',
        thumbnail: '',
        status: 'publish',
        sort_num: 0,
        categories: [],
        author: ''
    });


    const {message} = App.useApp();
    const {t} = useTranslations('posts');

    useEffect(() => {
        (async () => {
            try {
                const response = await apiGet(`/posts/${params.id}`);
                const data = response.data;
                setInitvalValues((prevState) => ({
                    ...prevState,
                    title: data.title,
                    slug: data.slug,
                    keywords: data.keywords,
                    description: data.description,
                    status: data.status,
                    sort_num: data.sort_num,
                    thumbnail: data.thumbnail,
                    author: data.author,
                    content: data.content,
                    categories: data.categories.map((item: CategoryType) => item.id.toString()),
                }));
            } catch (error) {
                message.error(t('fetchError'));
            } finally {
                setLoading(false);
            }
        })();
    }, [params.id]);


    const handleSubmit = async (values: PostType) => {
        const postData: PostType = {
            title: values.title,
            slug: values.slug,
            keywords: values.keywords,
            description: values.description,
            thumbnail: values.thumbnail,
            status: values.status,
            sort_num: values.sort_num,
            categories: values.categories,
            author: values.author,
            content: values.content,
        };
        try {
            setSubmitting(true);
            await apiPut(`/posts/${params.id}`, postData);
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
        <Card title={t('editPost')} variant="borderless" loading={loading}>
            <PostForm
                initialValues={initvalValues}
                submitting={submitting}
                onSubmit={handleSubmit}
            />
        </Card>
    );
}
