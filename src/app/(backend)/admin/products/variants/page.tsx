'use client';

import React, {useState, useEffect, useCallback} from 'react';
import {
    Table,
    Card,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Tag,
    App,
    Popconfirm,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    HolderOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import {apiGet, apiPost, apiPut, apiDelete} from "@/lib/backendApi";
import {useTranslations} from '@/contexts/BackendLocaleContext';

interface VariantOptionType {
    title: string;
    price?: number;
}

interface VariantType {
    id: number;
    name: string;
    options: VariantOptionType[];
}

let optionKeyCounter = 0;
const generateKey = () => `opt_${++optionKeyCounter}`;

export default function ProductVariantsManagement() {
    const [variants, setVariants] = useState<VariantType[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<VariantType | null>(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [optionInputs, setOptionInputs] = useState<VariantOptionType[]>([]);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('productVariants');

    const fetchVariants = () => {
        setLoading(true);
        apiGet('/product-variants').then(response => {
            setVariants(response.data.items || []);
        }).catch(reason => {
            message.error(reason.message || t('fetchError'));
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchVariants();
    }, []);

    const handleAdd = () => {
        setEditingItem(null);
        form.resetFields();
        setOptionInputs([{title: ''}]);
        setModalVisible(true);
    };

    const handleEdit = (record: VariantType) => {
        setEditingItem(record);
        form.setFieldsValue({name: record.name});
        if (record.options?.length) {
            setOptionInputs(record.options);
        } else {
            setOptionInputs([]);
        }
        setModalVisible(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await apiDelete(`/product-variants/${id}`);
            message.success(t('deleteSuccess'));
            fetchVariants();
        } catch (reason: unknown) {
            if (reason instanceof Error) {
                message.error(reason.message);
            }
        }
    };

    // Option input operations
    const addOption = () => {
        setOptionInputs(prev => [...prev, {title: ''}]);
    };

    const removeOption = (index: number) => {
        if (optionInputs.length <= 1) return;
        setOptionInputs(prev => prev.filter((o, i) => i !== index));
    };

    const updateOption = (index: number, title: string) => {
        setOptionInputs(prev => prev.map((o, i) => index === i ? {...o, title} : o));
    };

    // Drag & Drop
    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index) return;
        setOptionInputs(prev => {
            const newItems = [...prev];
            const [draggedItem] = newItems.splice(dragIndex, 1);
            newItems.splice(index, 0, draggedItem);
            return newItems;
        });
        setDragIndex(index);
    }, [dragIndex]);

    const handleDragEnd = () => {
        setDragIndex(null);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            const postData = {
                name: values.name,
                options: optionInputs
            };
            if (editingItem) {
                await apiPut(`/product-variants/${editingItem.id}`, postData);
                message.success(t('updateSuccess'));
            } else {
                await apiPost('/product-variants', postData);
                message.success(t('createSuccess'));
            }
            setModalVisible(false);
            fetchVariants();
        } catch (error: unknown) {
            if (error instanceof Error) {
                message.error(error.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const columns: ColumnsType<VariantType> = [
        {
            title: t('name'),
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (name: string) => (
                <strong className={'text-gray-600'}>{name}</strong>
            ),
        },
        {
            title: t('options'),
            dataIndex: 'options',
            key: 'options',
            width: 'auto',
            render: (options: VariantOptionType[], record) => (
                <Space size={[4, 4]} wrap>
                    {options?.map((opt, index) => (
                        <Tag key={`variant_opt_${record.id}_${index}`}>{opt.title}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: tc('actions'),
            key: 'action',
            width: 150,
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
                    <Popconfirm
                        title={t('deleteConfirm')}
                        onConfirm={() => handleDelete(record.id)}
                        okText={tc('confirm')}
                        cancelText={tc('cancel')}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined/>} className={'px-0!'}>
                            {tc('delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
                <h2 style={{fontSize: 24, fontWeight: 'bold', margin: 0}}>{t('variantManagement')}</h2>
                <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                    {t('addVariant')}
                </Button>
            </div>

            <Card>
                <Table
                    dataSource={variants}
                    columns={columns}
                    loading={loading}
                    pagination={false}
                    rowKey={record => record.id}
                />
            </Card>

            <Modal
                title={editingItem ? t('editVariant') : t('addVariant')}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                confirmLoading={submitting}
                width={520}
                okText={tc('save')}
                cancelText={tc('cancel')}
            >
                <Form form={form} layout="vertical" style={{marginTop: 16}}>
                    <Form.Item
                        name="name"
                        label={t('name')}
                        rules={[{required: true, message: t('nameRequired')}]}
                    >
                        <Input placeholder={t('namePlaceholder')}/>
                    </Form.Item>

                    <div style={{marginBottom: 8}}>
                        <div style={{marginBottom: 8, color: 'rgba(0,0,0,0.88)', fontSize: 14}}>
                            {t('options')} <span style={{color: '#ff4d4f'}}>*</span>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                            {optionInputs.map((opt, index) => (
                                <div
                                    key={'option_input_' + index}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        opacity: dragIndex === index ? 0.5 : 1,
                                        cursor: 'default',
                                    }}
                                >
                                    <HolderOutlined
                                        style={{
                                            cursor: 'grab',
                                            color: '#bfbfbf',
                                            fontSize: 14,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Input
                                        value={opt.title}
                                        onChange={(e) => updateOption(index, e.target.value)}
                                        placeholder={t('optionValuePlaceholder')}
                                        style={{flex: 1}}
                                    />
                                    {optionInputs.length > 1 && (
                                        <Button
                                            type="text"
                                            size="small"
                                            danger
                                            icon={<CloseOutlined/>}
                                            onClick={() => removeOption(index)}
                                            style={{flexShrink: 0}}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button
                            type="dashed"
                            icon={<PlusOutlined/>}
                            onClick={addOption}
                            style={{width: '100%', marginTop: 8}}
                        >
                            {t('addOption')}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
