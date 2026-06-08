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
    Modal, Descriptions,
} from 'antd';
import {
    SearchOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import {apiDelete, apiGet, apiPut} from "@/lib/backendApi";
import {useTranslations} from '@/contexts/BackendLocaleContext';

const {Search} = Input;

interface OrderItemType {
    id: number;
    title: string;
    price: number | string;
    quantity: number;
    subtotal?: number;
    sku_id?: number;
    sku_name?: string
}

interface OrderType {
    id: number;
    order_no: string;
    buyer_name: string;
    total: number | string;
    status: string;
    items: OrderItemType[];
    created_at: string;
}

const statusMap: Record<string, { color: string; labelKey: string }> = {
    pending: {color: 'warning', labelKey: 'pending'},
    paid: {color: 'processing', labelKey: 'paid'},
    shipped: {color: 'cyan', labelKey: 'shipped'},
    completed: {color: 'success', labelKey: 'completed'},
    cancelled: {color: 'default', labelKey: 'cancelled'},
    refunded: {color: 'error', labelKey: 'refunded'},
};

export default function OrdersManagement() {
    const [total, setTotal] = useState<number>(0);
    const [orders, setOrders] = useState<OrderType[]>([]);
    const [offset, setOffset] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedItems, setSelectedItems] = useState<React.Key[]>([]);
    const [batchAction, setBatchAction] = useState<string>('');
    const [detailVisible, setDetailVisible] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<OrderType | null>(null);

    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('orders');

    const handleView = (record: OrderType) => {
        setCurrentOrder(record);
        setDetailVisible(true);
    };

    const columns: ColumnsType<OrderType> = [
        {
            title: t('orderNo'),
            dataIndex: 'order_no',
            key: 'order_no',
            width: 180,
            render: (orderNo: string) => (
                <strong className={'text-gray-600'}>{orderNo}</strong>
            ),
        },
        {
            title: t('customer'),
            dataIndex: 'buyer_name',
            key: 'buyer_name',
            width: 120
        },
        {
            title: t('totalAmount'),
            dataIndex: 'total',
            key: 'total',
            width: 120,
            render: (amount: number | string) => `¥${Number(amount).toFixed(2)}`,
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const map = statusMap[status];
                return <Tag color={map?.color || 'default'}>{map ? t(map.labelKey) : status}</Tag>;
            },
        },
        {
            title: t('createdAt'),
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
                        icon={<EyeOutlined/>}
                        onClick={() => handleView(record)}
                        className={'px-0!'}
                    >
                        {t('view')}
                    </Button>
                </Space>
            ),
        },
    ];

    const fetchOrders = () => {
        setLoading(true);
        apiGet('/orders', {
            q: searchText,
            status: filterStatus === 'all' ? '' : filterStatus,
            offset,
            limit: 20,
        }).then(response => {
            const {items, total: t} = response.data;
            setTotal(t);
            setOrders([...items]);
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
            apiDelete(`/orders/batch`, {
                ids: selectedItems
            }).then(() => {
                setSelectedItems([]);
                fetchOrders();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }

        if (batchAction === 'cancel') {
            setLoading(true);
            apiPut(`/orders/batch`, {
                ids: selectedItems,
                data: {status: 'cancelled'},
            }).then(() => {
                message.success(t('cancelSuccess'));
                setSelectedItems([]);
                fetchOrders();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }

        if (batchAction === 'complete') {
            setLoading(true);
            apiPut(`/orders/batch`, {
                ids: selectedItems,
                data: {status: 'completed'},
            }).then(() => {
                message.success(t('completeSuccess'));
                setSelectedItems([]);
                fetchOrders();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }
    };

    React.useEffect(() => {
        fetchOrders();
    }, [offset, filterStatus]);

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{t('orderManagement')}</h2>
            <Card>
                <div style={{marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{width: 250}}
                        onSearch={(value) => {
                            setSearchText(value);
                            fetchOrders();
                        }}
                        prefix={<SearchOutlined/>}
                    />
                    <Select
                        defaultValue="all"
                        style={{width: 120}}
                        onChange={setFilterStatus}
                        options={[
                            {value: 'all', label: t('allStatus')},
                            {value: 'pending', label: t('pending')},
                            {value: 'paid', label: t('paid')},
                            {value: 'shipped', label: t('shipped')},
                            {value: 'completed', label: t('completed')},
                            {value: 'cancelled', label: t('cancelled')},
                            {value: 'refunded', label: t('refunded')},
                        ]}
                    />
                </div>

                <Table
                    rowSelection={{
                        type: 'checkbox',
                        selectedRowKeys: selectedItems,
                        onChange: (selectedRowKeys) => {
                            setSelectedItems([...selectedRowKeys]);
                        },
                    }}
                    dataSource={orders}
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
                                    {value: 'cancel', label: t('batchCancel')},
                                    {value: 'complete', label: t('batchComplete')},
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

            <Modal
                title={t('orderDetail')}
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={850}
                mask={{
                    closable: false
                }}
            >
                {currentOrder && (
                    <div>
                        <Descriptions
                            column={1}
                            style={{marginBottom: 16}}
                            styles={{
                                label: {width: 100, color: '#666'}
                            }}
                            items={[
                                {
                                    key: 'orderNo',
                                    label: t('orderNo'),
                                    children: currentOrder.order_no
                                },
                                {
                                    key: 'customer',
                                    label: t('customer'),
                                    children: currentOrder.buyer_name
                                },
                                {
                                    key: 'totalAmount',
                                    label: t('totalAmount'),
                                    children: `¥` + Number(currentOrder.total).toFixed(2)
                                },
                                {
                                    key: 'status',
                                    label: t('status'),
                                    children: (
                                        <Tag color={statusMap[currentOrder.status]?.color || 'default'}>
                                            {statusMap[currentOrder.status] ? t(statusMap[currentOrder.status].labelKey) : currentOrder.status}
                                        </Tag>
                                    )
                                },
                                {
                                    key: 'createdAt',
                                    label: t('createdAt'),
                                    children: currentOrder.created_at
                                }
                            ]}
                        />
                        <h4 style={{marginBottom: 8, fontWeight: 'bold'}}>{t('orderItems')}</h4>
                        <Table
                            dataSource={currentOrder.items || []}
                            pagination={false}
                            rowKey={record => record.id}
                            size="small"
                            columns={[
                                {
                                    title: t('productTitle'),
                                    dataIndex: 'title',
                                    key: 'title',
                                    render: (_, record) => {
                                        return (
                                            <>
                                                <div>{record.title}</div>
                                                {
                                                    record.sku_name && (
                                                        <div className={`text-gray-500! text-sm!`}>{record.sku_name}</div>
                                                    )
                                                }
                                            </>
                                        )
                                    }
                                },
                                {
                                    title: t('price'),
                                    dataIndex: 'price',
                                    key: 'price',
                                    width: 100,
                                    render: (price: number | string) => `¥${Number(price).toFixed(2)}`,
                                },
                                {title: t('quantity'), dataIndex: 'quantity', key: 'quantity', width: 80},
                                {
                                    title: t('subtotal'),
                                    dataIndex: 'subtotal',
                                    key: 'subtotal',
                                    width: 100,
                                    render: (subtotal: number | string) => `¥${Number(subtotal).toFixed(2)}`,
                                }
                            ]}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}
