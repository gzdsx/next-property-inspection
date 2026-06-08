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
import {CategoryCascader} from "@/components/backend/CategoryCascader";
import Link from "next/link";

const {Search} = Input;

interface ProductType {
    id: number;
    title: string;
    slug: string;
    description: string;
    content: string;
    thumbnail: string;
    price: number;
    original_price: number;
    status: string;
    sort_num: number;
    categories: number[];
    created_at: string;
    url: string;
}

interface CategoryOption {
    id: number;
    name: string;
}

export default function ProductsManagement() {
    const [total, setTotal] = useState<number>(0);
    const [products, setProducts] = useState<ProductType[]>([]);
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
    const {t} = useTranslations('products');

    const handleAdd = () => {
        router.push('/admin/products/create');
    };

    const handleEdit = (record: ProductType) => {
        router.push(`/admin/products/${record.id}/edit`);
    };

    const columns: ColumnsType<ProductType> = [
        {
            title: t('title'),
            dataIndex: 'title',
            key: 'title',
            width: 'auto',
            render: (title: string, record) => (
                <Link href={record.url} target="_blank">
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
                return categories?.map(category => (
                    <a key={category.id}>{category.name}</a>
                ));
            },
        },
        {
            title: t('price'),
            dataIndex: 'price',
            key: 'price',
            width: 100,
            render: (price: number | string) => `¥${Number(price).toFixed(2)}`,
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string, record: ProductType) => {
                const color = record.status === 'active' ? 'success' : 'default';
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

    const fetchProducts = () => {
        setLoading(true);
        apiGet('/products', {
            q: searchText,
            status: filterStatus === 'all' ? '' : filterStatus,
            category: (filterCategory === undefined || filterCategory?.length === 0) ? '' : filterCategory?.at(-1),
            offset,
            limit: 20,
        }).then(response => {
            const {items, total: t} = response.data;
            setTotal(t);
            setProducts([...items]);
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
            apiDelete(`/products/batch`, {ids: selectedItems as number[]}).then(() => {
                message.success(t('deleteSuccess'));
                setSelectedItems([]);
                fetchProducts();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }

        if (batchAction === 'publish') {
            setLoading(true);
            apiPut(`/products/batch`, {
                ids: selectedItems,
                data: {status: 'publish'},
            }).then(() => {
                message.success(t('publishSuccess'));
                setSelectedItems([]);
                fetchProducts();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }

        if (batchAction === 'unpublish') {
            setLoading(true);
            apiPut(`/products/batch`, {
                ids: selectedItems,
                data: {status: 'draft'},
            }).then(() => {
                message.success(t('unpublishSuccess'));
                setSelectedItems([]);
                fetchProducts();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }
    };

    React.useEffect(() => {
        fetchProducts();
    }, [offset, filterStatus, filterCategory]);

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{t('productManagement')}</h2>
            <Card>
                <div style={{marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{width: 250}}
                        onSearch={(value) => {
                            setSearchText(value);
                            fetchProducts();
                        }}
                        prefix={<SearchOutlined/>}
                    />
                    <Select
                        defaultValue="all"
                        style={{width: 120}}
                        onChange={setFilterStatus}
                        options={[
                            {label: t('allStatus'), value: 'all'},
                            {label: t('active'), value: 'active'},
                            {label: t('inactive'), value: 'inactive'},
                            {label: t('soldout'), value: 'soldout'},
                        ]}
                    />
                    <CategoryCascader
                        value={filterCategory}
                        taxonomy={'product_category'}
                        onChange={setFilterCategory}
                        extraOptions={[{label: t('allCategories'), value: ''}]}
                    />
                    <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                        {t('addProduct')}
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
                    dataSource={products}
                    columns={columns}
                    loading={loading}
                    pagination={false}
                    rowKey={record => record.id}
                />

                <div className={'flex justify-between items-center mt-4'}>
                    <div className={'grow flex flex-row gap-x-4'}>
                        <Select
                            className={'w-40'}
                            defaultValue={''}
                            placeholder={tc('batchAction')}
                            onChange={(value) => setBatchAction(value)}
                            options={[
                                {label: tc('batchAction'), value: ''},
                                {label: tc('delete'), value: 'delete'},
                                {label: t('publish'), value: 'publish'},
                                {label: t('unpublish'), value: 'unpublish'}
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
