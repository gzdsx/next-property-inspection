'use client';

import React, {useState} from 'react';
import {
    Table,
    Card,
    Button,
    Space,
    Tag,
    Input,
    Select,
    Pagination,
    App,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import {apiGet, apiDelete, apiPut} from "@/lib/backendApi";
import {useRouter} from "next/navigation";
import {useTranslations} from '@/contexts/BackendLocaleContext';
import Link from "next/link";
import {CategoryCascader} from "@/components/backend/CategoryCascader";

const {Search} = Input;

interface PostType {
    id: number;
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
    created_at: string;
}

interface CategoryOption {
    id: number;
    name: string;
}

export default function PostsManagement() {
    const [total, setTotal] = useState<number>(0);
    const [posts, setPosts] = useState<PostType[]>([]);
    const [offset, setOffset] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string[]>(['']);
    const [selectedItems, setSelectedItems] = useState<React.Key[]>([]);
    const [batchAction, setBatchAction] = useState<string>('');

    const {message} = App.useApp();
    const router = useRouter();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('posts');

    const handleAdd = () => {
        router.push('/admin/posts/create');
    };

    const handleEdit = (record: PostType) => {
        router.push(`/admin/posts/${record.id}/edit`);
    };

    const columns: ColumnsType<PostType> = [
        {
            title: t('title'),
            dataIndex: 'title',
            key: 'title',
            width: 'auto',
            render: (title: string, record) => (
                <Link href={`/posts/${record.slug}`}>
                    <strong className={'text-gray-600'}>{title}</strong>
                </Link>
            ),
        },
        {
            title: t('category'),
            dataIndex: 'categories',
            key: 'categories',
            width: 100,
            render: (categories: CategoryOption[]) => {
                return categories.map(category => (
                    <a key={category.id}>{category.name}</a>
                ));
            },
        },
        {
            title: t('author'),
            dataIndex: 'author',
            key: 'author',
            width: 100,
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string, record: PostType) => {
                const color = record.status === 'publish' ? 'success' : 'default';
                return <Tag color={color}>{t(status)}</Tag>;
            },
        },
        {
            title: tc('createdAt'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
        },
        {
            title: tc('actions'),
            key: 'action',
            width: 80,
            align: 'end',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined/>}
                        onClick={() => handleEdit(record)}
                        className={'px-0!'}
                    >
                        {tc('edit')}
                    </Button>
                </Space>
            ),
        },
    ];

    const fetchPosts = () => {
        setLoading(true);
        apiGet('/posts', {
            q: searchText,
            status: filterStatus === 'all' ? '' : filterStatus,
            category: (filterCategory == undefined || filterCategory?.length === 0) ? '' : filterCategory.at(-1),
            offset,
            limit: 20,
        }).then(response => {
            const {items, total: t} = response.data;
            setTotal(t);
            setPosts([...items]);
        }).catch(reason => {
            message.error(reason.message || t('fetchError'));
        }).finally(() => {
            setLoading(false);
        });
    };

    const handleBatchAction = () => {
        if (!batchAction) return;

        if (batchAction === 'delete') {
            setLoading(true);
            apiDelete(`/posts/batch`, {ids: selectedItems as number[]}).then(() => {
                message.success(t('deleteSuccess'));
                setSelectedItems([]);
                fetchPosts();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }

        if (batchAction === 'publish') {
            setLoading(true);
            apiPut(`/posts/batch`, {
                ids: selectedItems,
                data: {status: 'publish'},
            }).then(() => {
                message.success(t('publishSuccess'));
                setSelectedItems([]);
                fetchPosts();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }

        if (batchAction === 'unpublish') {
            setLoading(true);
            apiPut(`/posts/batch`, {
                ids: selectedItems,
                data: {status: 'draft'},
            }).then(() => {
                message.success(t('unpublishSuccess'));
                setSelectedItems([]);
                fetchPosts();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }
    };

    React.useEffect(() => {
        fetchPosts();
    }, [offset, filterStatus, filterCategory]);

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{t('postManagement')}</h2>
            <Card>
                <div style={{marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{width: 250}}
                        onSearch={(value) => {
                            setSearchText(value);
                            fetchPosts();
                        }}
                        prefix={<SearchOutlined/>}
                    />
                    <Select
                        defaultValue="all"
                        style={{width: 120}}
                        onChange={setFilterStatus}
                        options={[
                            {value: 'all', label: t('allStatus')},
                            {value: 'publish', label: t('publish')},
                            {value: 'draft', label: t('draft')},
                        ]}
                    />
                    <CategoryCascader
                        value={filterCategory}
                        onChange={setFilterCategory}
                        extraOptions={[{label: t('allCategories'), value: ''}]}
                    />
                    <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                        {t('addPost')}
                    </Button>
                </div>

                <Table
                    rowSelection={{
                        type: 'checkbox',
                        selectedRowKeys: selectedItems,
                        onChange: (selectedRowKeys) => {
                            setSelectedItems([...selectedRowKeys]);
                        },
                    }}
                    dataSource={posts}
                    columns={columns}
                    loading={loading}
                    pagination={false}
                    rowKey={record => record.id}
                />

                <div className={'flex justify-between items-center mt-4'}>
                    <div className={'grow flex flex-row gap-x-4'}>
                        <Select className={'w-40'} defaultValue={''} placeholder={tc('batchAction')}
                                onChange={(value) => setBatchAction(value)}
                                options={[
                                    {value: '', label: tc('batchAction')},
                                    {value: 'delete', label: tc('delete')},
                                    {value: 'publish', label: t('batchPublish')},
                                    {value: 'unpublish', label: t('batchUnpublish')},
                                ]}
                        />
                        <Button type="primary" disabled={selectedItems.length === 0}
                                onClick={handleBatchAction}>{tc('apply')}</Button>
                    </div>
                    <Pagination
                        total={total}
                        pageSize={20}
                        showSizeChanger={false}
                        showTotal={(total) => tc('totalRecords', {total})}
                        onChange={(page, pageSize) => {
                            setOffset((page - 1) * pageSize);
                        }}
                    />
                </div>
            </Card>
        </div>
    );
}
