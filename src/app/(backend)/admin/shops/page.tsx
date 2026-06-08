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

const {Search} = Input;

interface ShopType {
    id: number;
    name: string;
    address: string;
    phone: string;
    status: string;
    description: string;
    longitude: number;
    latitude: number;
    business_hours: string;
    cover: string;
    manager: string;
    sort_num: number;
    created_at: string;
}

export default function ShopsManagement() {
    const [total, setTotal] = useState<number>(0);
    const [shops, setShops] = useState<ShopType[]>([]);
    const [offset, setOffset] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedItems, setSelectedItems] = useState<React.Key[]>([]);
    const [batchAction, setBatchAction] = useState<string>('');

    const {message} = App.useApp();
    const router = useRouter();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('shops');

    const handleAdd = () => {
        router.push('/admin/shops/create');
    };

    const handleEdit = (record: ShopType) => {
        router.push(`/admin/shops/${record.id}/edit`);
    };

    const columns: ColumnsType<ShopType> = [
        {
            title: t('name'),
            dataIndex: 'name',
            key: 'name',
            width: 'auto',
            render: (name: string) => (
                <strong className={'text-gray-600'}>{name}</strong>
            ),
        },
        {
            title: t('address'),
            dataIndex: 'address',
            key: 'address',
            width: 200,
        },
        {
            title: t('phone'),
            dataIndex: 'phone',
            key: 'phone',
            width: 140,
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string, record: ShopType) => {
                const color = record.status === 'open' ? 'success' : 'default';
                return <Tag color={color}>{status}</Tag>;
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

    const fetchShops = () => {
        setLoading(true);
        apiGet('/shops', {
            q: searchText,
            status: filterStatus === 'all' ? '' : filterStatus,
            offset,
            limit: 20,
        }).then(response => {
            const {items, total: t} = response.data;
            setTotal(t);
            setShops([...items]);
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
            apiDelete(`/shops/batch`, {ids: selectedItems as number[]}).then(() => {
                message.success(t('deleteSuccess'));
                setSelectedItems([]);
                fetchShops();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }

        if (batchAction === 'open') {
            setLoading(true);
            apiPut(`/shops/batch`, {
                ids: selectedItems,
                data: {status: 'open'},
            }).then(() => {
                message.success(t('openSuccess'));
                setSelectedItems([]);
                fetchShops();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }

        if (batchAction === 'closed') {
            setLoading(true);
            apiPut(`/shops/batch`, {
                ids: selectedItems,
                data: {status: 'closed'},
            }).then(() => {
                message.success(t('closedSuccess'));
                setSelectedItems([]);
                fetchShops();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }
    };

    React.useEffect(() => {
        fetchShops();
    }, [offset, filterStatus]);

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{t('shopManagement')}</h2>
            <Card>
                <div style={{marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{width: 250}}
                        onSearch={(value) => {
                            setSearchText(value);
                            fetchShops();
                        }}
                        prefix={<SearchOutlined/>}
                    />
                    <Select
                        defaultValue="all"
                        style={{width: 120}}
                        onChange={setFilterStatus}
                        options={[
                            {value: 'all', label: t('allStatus')},
                            {value: 'open', label: t('open')},
                            {value: 'closed', label: t('closed')},
                        ]}
                    />
                    <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                        {t('addShop')}
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
                    dataSource={shops}
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
                                    {value: 'open', label: t('batchOpen')},
                                    {value: 'closed', label: t('batchClosed')},
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
