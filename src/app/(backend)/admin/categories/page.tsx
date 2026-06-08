'use client';

import React, {useState, useEffect} from 'react';
import {
    Table,
    Card,
    Button,
    Space,
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    App,
    Popconfirm,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import {apiGet, apiPost, apiPut, apiDelete} from "@/lib/backendApi";
import {useTranslations} from '@/contexts/BackendLocaleContext';
import {useSearchParams} from 'next/navigation';


interface CategoryType {
    id: number;
    name: string;
    slug: string;
    parent_id: number;
    sort_num: number;
    description: string;
    children?: CategoryType[];
}

interface FlatCategoryOption {
    id: number;
    name: string;
    parent_id: number;
    depth: number;
}

function flattenCategories(categories: CategoryType[], depth = 0): FlatCategoryOption[] {
    const result: FlatCategoryOption[] = [];
    for (const cat of categories) {
        result.push({id: cat.id, name: cat.name, parent_id: cat.parent_id, depth});
        if (cat.children?.length) {
            result.push(...flattenCategories(cat.children, depth + 1));
        }
    }
    return result;
}

export default function CategoriesManagement() {
    const searchParams = useSearchParams();
    const taxonomy = searchParams.get('taxonomy') || 'category';
    const [categories, setCategories] = useState<CategoryType[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<CategoryType | null>(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('categories');

    const fetchCategories = () => {
        setLoading(true);
        apiGet('/categories', {taxonomy}).then(response => {
            setCategories(response.data.items || []);
        }).catch(reason => {
            message.error(reason.message || t('fetchError'));
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchCategories();
    }, [taxonomy]);

    const flatOptions = flattenCategories(categories);

    const handleAdd = (parentId?: number) => {
        setEditingItem(null);
        form.resetFields();
        if (parentId !== undefined) {
            form.setFieldsValue({parent_id: parentId});
        }
        setModalVisible(true);
    };

    const handleEdit = (record: CategoryType) => {
        setEditingItem(record);
        form.setFieldsValue({
            name: record.name,
            slug: record.slug,
            parent_id: record.parent_id || 0,
            sort_num: record.sort_num,
            description: record.description,
        });
        setModalVisible(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await apiDelete(`/categories/${id}`);
            message.success(t('deleteSuccess'));
            fetchCategories();
        } catch (reason: unknown) {
            if (reason instanceof Error) {
                message.error(reason.message);
            }
        }
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            if (editingItem) {
                await apiPut(`/categories/${editingItem.id}`, values);
                message.success(t('updateSuccess'));
            } else {
                await apiPost('/categories', {...values, taxonomy});
                message.success(t('createSuccess'));
            }
            setModalVisible(false);
            fetchCategories();
        } catch (error: unknown) {
            if (error instanceof Error) {
                message.error(error.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const columns: ColumnsType<CategoryType> = [
        {
            title: t('name'),
            dataIndex: 'name',
            key: 'name',
            width: 'auto',
        },
        {
            title: t('slug'),
            dataIndex: 'slug',
            key: 'slug',
            width: 'auto',
            render: (slug: string) => <span className="text-gray-400">{slug}</span>,
        },
        {
            title: t('sortOrder'),
            dataIndex: 'sort_num',
            key: 'sort_num',
            width: 80,
            align: 'center',
        },
        {
            title: tc('actions'),
            key: 'action',
            width: 200,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<PlusOutlined/>}
                        onClick={() => handleAdd(record.id)}
                        className={'px-0!'}
                    >
                        {t('addChild')}
                    </Button>
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
                <h2 style={{fontSize: 24, fontWeight: 'bold', margin: 0}}>{t(taxonomy)}</h2>
                <Button type="primary" icon={<PlusOutlined/>} onClick={() => handleAdd()}>
                    {t('addCategory')}
                </Button>
            </div>

            <Card>
                <Table
                    dataSource={categories}
                    columns={columns}
                    loading={loading}
                    pagination={false}
                    rowKey={record => record.id}
                    expandable={{
                        defaultExpandAllRows: true,
                        childrenColumnName: 'children',
                    }}
                />
            </Card>

            <Modal
                title={editingItem ? t('editCategory') : t('addCategory')}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                confirmLoading={submitting}
                width={520}
                okText={tc('save')}
                cancelText={tc('cancel')}
            >
                <Form form={form} layout="vertical" style={{marginTop: 16}}
                      initialValues={{parent_id: 0, sort_num: 0, description: ''}}>
                    <Form.Item
                        name="name"
                        label={t('name')}
                        rules={[{required: true, message: t('nameRequired')}]}
                    >
                        <Input placeholder={t('namePlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        name="slug"
                        label={t('slug')}
                    >
                        <Input placeholder={t('slugPlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        name="parent_id"
                        label={t('parentCategory')}
                    >
                        <Select allowClear placeholder={t('parentPlaceholder')}
                            options={[
                                {value: 0, label: t('topLevel')},
                                ...flatOptions.map(opt => ({
                                    value: opt.id,
                                    label: '\u3000'.repeat(opt.depth) + opt.name,
                                })),
                            ]}
                        />
                    </Form.Item>

                    <Form.Item
                        name="sort_num"
                        label={t('sortOrder')}
                    >
                        <InputNumber min={0} style={{width: '100%'}} placeholder="0"/>
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label={t('description')}
                    >
                        <Input.TextArea rows={3} placeholder={t('descriptionPlaceholder')}/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
