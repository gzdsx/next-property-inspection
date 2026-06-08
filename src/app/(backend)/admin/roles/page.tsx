'use client';

import React, {useEffect, useState} from 'react';
import {
    Table,
    Card,
    Button,
    Space,
    Tag,
    Input,
    Modal,
    Form,
    App,
    Tooltip,
    Popconfirm,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    LockOutlined,
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import {apiGet, apiPost, apiPut, apiDelete} from '@/lib/backendApi';
import {useTranslations} from '@/contexts/BackendLocaleContext';

const {Search} = Input;

interface RoleType {
    id: number;
    name: string;
    slug: string;
    description: string;
    is_system: boolean;
    permissions: string[];
    sort_order: number;
    created_at: string;
}

export default function RolesManagement() {
    const [roles, setRoles] = useState<RoleType[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleType | null>(null);
    const [selectedItems, setSelectedItems] = useState<React.Key[]>([]);
    const [form] = Form.useForm();

    const {message} = App.useApp();
    const {t} = useTranslations('roles');

    const fetchRoles = () => {
        setLoading(true);
        apiGet('/roles', {
            q: searchText
        }).then(response => {
            const {items} = response.data;
            setRoles([...items]);
        }).catch(reason => {
            message.error(reason.message || t('fetchError'));
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchRoles();
    }, []);

    const handleAdd = () => {
        setEditingRole(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record: RoleType) => {
        if (record.is_system) return;
        setEditingRole(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (editingRole) {
                await apiPut(`/roles/${editingRole.id}`, values);
                message.success(t('updateSuccess'));
            } else {
                await apiPost('/roles', values);
                message.success(t('createSuccess'));
            }
            setModalVisible(false);
            fetchRoles();
        } catch (error: any) {
            if (error?.message) {
                message.error(error.message);
            }
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await apiDelete(`/roles/${id}`);
            message.success(t('deleteSuccess'));
            fetchRoles();
        } catch (reason: any) {
            message.error(reason.message || t('deleteError'));
        }
    };

    const columns: ColumnsType<RoleType> = [
        {
            title: t('name'),
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (name: string, record) => (
                <Space>
                    <strong className="text-gray-600">{name}</strong>
                    {record.is_system && (
                        <Tooltip title={t('systemRole')}>
                            <LockOutlined className="text-gray-400 text-xs"/>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
        {
            title: t('slug'),
            dataIndex: 'slug',
            key: 'slug',
            width: 200,
            render: (slug: string) => <Tag>{slug}</Tag>,
        },
        {
            title: t('description'),
            dataIndex: 'description',
            key: 'description',
            width: 'auto',
            ellipsis: true,
        },
        {
            title: t('actions'),
            key: 'action',
            width: 120,
            align: 'end',
            render: (_: unknown, record: RoleType) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined/>}
                        disabled={record.is_system}
                        onClick={() => handleEdit(record)}
                        className="px-0!"
                    >
                        {t('edit')}
                    </Button>
                    <Popconfirm
                        title={t('deleteConfirm')}
                        onConfirm={() => handleDelete(record.id)}
                        okText={t('confirm')}
                        cancelText={t('cancel')}
                        disabled={record.is_system}
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined/>}
                            disabled={record.is_system}
                            className="px-0!"
                        >
                            {t('delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{t('roleManagement')}</h2>
            <Card>
                <div style={{marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{width: 250}}
                        onSearch={(value) => {
                            setSearchText(value);
                            fetchRoles();
                        }}
                        prefix={<SearchOutlined/>}
                    />
                    <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                        {t('addRole')}
                    </Button>
                </div>

                <Table
                    dataSource={roles}
                    columns={columns}
                    loading={loading}
                    pagination={false}
                    rowKey={record => record.id}
                />
            </Card>

            <Modal
                title={editingRole ? t('editRole') : t('addRole')}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                width={600}
                okText={t('save')}
                cancelText={t('cancel')}
            >
                <Form form={form} layout="vertical" style={{marginTop: 16}}>
                    <Form.Item name="name" label={t('name')} rules={[{required: true, message: t('nameRequired')}]}>
                        <Input placeholder={t('namePlaceholder')}/>
                    </Form.Item>
                    <Form.Item name="slug" label={t('slug')} rules={[{required: true, message: t('slugRequired')}]}>
                        <Input placeholder={t('slugPlaceholder')}/>
                    </Form.Item>
                    <Form.Item name="description" label={t('description')}>
                        <Input.TextArea rows={3} placeholder={t('descriptionPlaceholder')}/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
