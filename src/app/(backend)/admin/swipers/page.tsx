'use client';

import React, {useState, useEffect} from 'react';
import {
    Table,
    Card,
    Button,
    Input,
    Pagination,
    Modal,
    Form,
    App,
    Popconfirm,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    PictureOutlined,
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import {apiGet, apiPost, apiPut, apiDelete} from "@/lib/backendApi";
import {useTranslations} from '@/contexts/BackendLocaleContext';
import {useRouter} from 'next/navigation';

const {Search} = Input;

interface SwiperType {
    id: number;
    title: string;
    description: string;
    created_at: string;
}

export default function SwipersManagement() {
    const [total, setTotal] = useState<number>(0);
    const [items, setItems] = useState<SwiperType[]>([]);
    const [offset, setOffset] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedItems, setSelectedItems] = useState<React.Key[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<SwiperType | null>(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('swipers');
    const router = useRouter();

    const fetchSwipers = () => {
        setLoading(true);
        apiGet('/swipers', {
            q: searchText,
            offset,
            limit: 20,
        }).then(response => {
            const {items: list, total: t} = response.data;
            setTotal(t);
            setItems([...list]);
        }).catch(reason => {
            message.error(reason.message || t('fetchError'));
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchSwipers();
    }, [offset]);

    const handleAdd = () => {
        setEditingItem(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record: SwiperType) => {
        setEditingItem(record);
        form.setFieldsValue({
            title: record.title,
            description: record.description || '',
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            if (editingItem) {
                await apiPut(`/swipers/${editingItem.id}`, values);
                message.success(t('updateSuccess'));
            } else {
                await apiPost('/swipers', values);
                message.success(t('createSuccess'));
            }
            setModalVisible(false);
            fetchSwipers();
        } catch (error: unknown) {
            if (error instanceof Error) {
                message.error(error.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleBatchDelete = () => {
        setLoading(true);
        apiDelete('/swipers/batch', {ids: selectedItems as number[]}).then(() => {
            message.success(t('deleteSuccess'));
            fetchSwipers();
        }).catch(reason => {
            message.error(reason.message);
        }).finally(() => {
            setSelectedItems([]);
            setLoading(false);
        });
    };

    const columns: ColumnsType<SwiperType> = [
        {
            title: t('title'),
            dataIndex: 'title',
            key: 'title',
            width: 400,
            render: (title: string, record) => (
                <div>
                    <strong className="text-gray-600">{title}</strong>
                    <div style={{marginTop: 4}}>
                        <Button
                            type="link"
                            size="small"
                            icon={<PictureOutlined/>}
                            onClick={() => router.push(`/admin/swipers/${record.id}/slides`)}
                            className="px-0"
                            style={{paddingLeft: 0}}
                        >
                            {t('manageSlides')}
                        </Button>
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined/>}
                            onClick={() => handleEdit(record)}
                            className="px-0"
                        >
                            {tc('edit')}
                        </Button>
                        <Popconfirm
                            title={t('deleteSlideConfirm')}
                            onConfirm={async () => {
                                try {
                                    await apiDelete(`/swipers/${record.id}`);
                                    message.success(t('deleteSuccess'));
                                    fetchSwipers();
                                } catch (reason: unknown) {
                                    if (reason instanceof Error) message.error(reason.message);
                                }
                            }}
                            okText={tc('confirm')}
                            cancelText={tc('cancel')}
                        >
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<DeleteOutlined/>}
                                className="px-0"
                            >
                                {tc('delete')}
                            </Button>
                        </Popconfirm>
                    </div>
                </div>
            ),
        },
        {
            title: t('description'),
            dataIndex: 'description',
            key: 'description',
            width: 'auto',
            render: (desc: string) => <span style={{color: '#666'}}>{desc || '-'}</span>,
        }
    ];

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{t('swiperManagement')}</h2>
            <Card>
                <div style={{marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{width: 250}}
                        onSearch={(value) => {
                            setSearchText(value);
                            fetchSwipers();
                        }}
                        prefix={<SearchOutlined/>}
                    />
                    <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                        {t('addSwiper')}
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
                    dataSource={items}
                    columns={columns}
                    loading={loading}
                    pagination={false}
                    rowKey={record => record.id}
                />
                <div className="flex justify-between items-center mt-4">
                    <div className="grow flex flex-row gap-x-4">
                        <Popconfirm
                            title={t('batchDeleteSlideConfirm')}
                            onConfirm={handleBatchDelete}
                            okText={tc('confirm')}
                            cancelText={tc('cancel')}
                        >
                            <Button danger disabled={selectedItems.length === 0}>{tc('batchDelete')}</Button>
                        </Popconfirm>
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
                title={editingItem ? t('editSwiper') : t('addSwiper')}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                confirmLoading={submitting}
                width={560}
                okText={tc('save')}
                cancelText={tc('cancel')}
            >
                <Form form={form} layout="vertical" style={{marginTop: 16}}>
                    <Form.Item
                        name="title"
                        label={t('title')}
                        rules={[{required: true, message: t('titlePlaceholder')}]}>
                        <Input placeholder={t('titlePlaceholder')}/>
                    </Form.Item>

                    <Form.Item name="description" label={t('description')}>
                        <Input.TextArea rows={3} placeholder={t('descriptionPlaceholder')}/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
