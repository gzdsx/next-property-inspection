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
    App
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

const {Search} = Input;

interface PageType {
    key: string;
    id: number;
    title: string;
    slug: string;
    status: string;
    status_desc: string;
    cover: string;
    excerpt: string;
    sort_order: number;
    created_at: string;
}

export default function PagesManagement() {
    const [total, setTotal] = useState<number>(0);
    const [pages, setPages] = useState<PageType[]>([]);
    const [offset, setOffset] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedItems, setSelectedItems] = useState<React.Key[]>([]);
    const [batchAction, setBatchAction] = useState<string>('');

    const {message} = App.useApp();
    const router = useRouter();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('pages');

    const handleAdd = () => {
        router.push('/admin/pages/create');
    };

    const handleEdit = (record: PageType) => {
        router.push(`/admin/pages/${record.id}/edit`);
    };

    const columns: ColumnsType<PageType> = [
        {
            title: t('title'),
            dataIndex: 'title',
            key: 'title',
            width: 'auto',
            render: (title: string, record) => (
                <Link href={`/${record.slug}`} target={'_blank'}>
                    <strong className={'text-gray-600'}>{title}</strong>
                </Link>
            ),
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string, record: PageType) => {
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
                        className={'px-0'}
                    >
                        {tc('edit')}
                    </Button>
                </Space>
            ),
        },
    ];

    const fetchPages = () => {
        setLoading(true);
        apiGet('/pages', {
            q: searchText,
            status: filterStatus === 'all' ? undefined : filterStatus,
            offset,
            limit: 20,
        }).then(response => {
            const {items, total: t} = response.data;
            setTotal(t);
            setPages([...items]);
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
            apiDelete(`/pages/batch`, {ids: selectedItems as number[]}).then(() => {
                message.success(t('deleteSuccess'));
                fetchPages();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setSelectedItems([]);
                setLoading(false);
            });
        }

        if (batchAction === 'publish') {
            setLoading(true);
            apiPut(`/pages/batch`, {
                ids: selectedItems,
                data: {status: 'publish'},
            }).then(() => {
                message.success(t('publishSuccess'));
                fetchPages();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setSelectedItems([]);
                setLoading(false);
            });
        }

        if (batchAction === 'unpublish') {
            setLoading(true);
            apiPut(`/pages/batch`, {
                ids: selectedItems,
                data: {status: 'draft'},
            }).then(() => {
                message.success(t('unpublishSuccess'));
                fetchPages();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setSelectedItems([]);
                setLoading(false);
            });
        }
    };

    React.useEffect(() => {
        fetchPages();
    }, [offset, filterStatus]);

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{t('pageManagement')}</h2>
            <Card>
                <div style={{marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{width: 250}}
                        onSearch={(value) => {
                            setSearchText(value);
                            fetchPages();
                        }}
                        prefix={<SearchOutlined/>}
                    />
                    <Select
                        defaultValue="all"
                        style={{width: 120}}
                        onChange={setFilterStatus}
                        options={[
                            {label: t('allStatus'), value: 'all'},
                            {label: t('publish'), value: 'publish'},
                            {label: t('draft'), value: 'draft'}
                        ]}
                    />
                    <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                        {t('addPage')}
                    </Button>
                </div>

                <Table
                    rowSelection={{
                        type: 'checkbox',
                        selectedRowKeys: selectedItems,
                        onChange: (selectedRowKeys, selectedRows) => {
                            setSelectedItems([...selectedRowKeys]);
                        },
                    }}
                    dataSource={pages}
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
