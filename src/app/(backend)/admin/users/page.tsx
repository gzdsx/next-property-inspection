'use client';

import React, {useEffect, useState} from 'react';
import {
    Table,
    Card,
    Button,
    Space,
    Tag,
    Input,
    Select,
    Avatar,
    Pagination,
    App,
    Popconfirm,
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SearchOutlined,
    UserOutlined,
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import {apiGet, apiDelete} from '@/lib/backendApi';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import Link from "next/link";
import UserRoleSelect from "./UserRoleSelect";
import UserStatusSelect from "./UserStatusSelect";
import {useRouter} from "next/navigation";

const {Search} = Input;

interface RoleType {
    id: number;
    name: string;
    slug: string;
}

interface UserType {
    id: number;
    name: string;
    email: string;
    role: RoleType;
    status: string;
    avatar: string;
    created_at: string;
}

export default function UsersManagement() {
    const router = useRouter();
    const [total, setTotal] = useState<number>(0);
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [offset, setOffset] = useState<number>(0);
    const [searchText, setSearchText] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedItems, setSelectedItems] = useState<React.Key[]>([]);
    const [batchAction, setBatchAction] = useState<string>('');

    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('users');

    const handleAdd = () => {
        router.push('/admin/users/create');
    }

    const handleDelete = async (id: number) => {
        try {
            await apiDelete(`/users/${id}`);
            message.success(t('deleteSuccess'));
            fetchUsers();
        } catch (reason: unknown) {
            if (reason instanceof Error) {
                message.error(reason.message || t('deleteError'));
            }
        }
    };

    const handleBatchAction = () => {
        if (!batchAction || selectedItems.length === 0) return;

        if (batchAction === 'delete') {
            setLoading(true);
            apiDelete('/users/batch', {ids: selectedItems as number[]}).then(() => {
                message.success(t('deleteSuccess'));
                setSelectedItems([]);
                fetchUsers();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setLoading(false);
            });
        }
    };

    const columns: ColumnsType<UserType> = [
        {
            title: t('userInfo'),
            key: 'userInfo',
            render: (_, record) => (
                <Space size={'small'}>
                    <Avatar icon={<UserOutlined/>} size={50} src={record.avatar}/>
                    <div>
                        <div style={{fontWeight: 500}}>{record.name}</div>
                        <Space style={{marginTop: 4}}>
                            <Link href={`/admin/users/${record.id}/edit`}>
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<EditOutlined/>}
                                    className="px-0!"
                                >
                                    {tc('edit')}
                                </Button>
                            </Link>
                            <Popconfirm
                                title={t('deleteConfirm')}
                                onConfirm={() => handleDelete(record.id)}
                                okText={t('confirm')}
                                cancelText={t('cancel')}
                            >
                                <Button
                                    type={"link"}
                                    size={"small"}
                                    icon={<DeleteOutlined/>}
                                    className={'px-0!'}
                                    danger
                                >{tc('delete')}</Button>
                            </Popconfirm>
                        </Space>
                    </div>
                </Space>
            ),
        },
        {
            title: t('email'),
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: t('role'),
            key: 'role',
            width: 120,
            render: (_, record) => <span>{record.role?.name}</span>,
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const color = status === 'active' ? 'success' : 'default';
                return <Tag color={color}>{t(status)}</Tag>
            },
        },
        {
            title: t('createdAt'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
        },
    ];

    const fetchUsers = () => {
        setLoading(true);
        apiGet('/users', {
            q: searchText,
            role: filterRole === 'all' ? '' : filterRole,
            status: filterStatus === 'all' ? '' : filterStatus,
            offset,
            limit: 20,
        }).then((response) => {
            const {total, items} = response.data;
            setUsers([...items]);
            setTotal(total);
        }).catch(() => {
            message.error(t('fetchError'));
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, [offset, filterRole, filterStatus]);

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{t('userManagement')}</h2>

            <Card>
                <div style={{marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{width: 250}}
                        onSearch={(value) => {
                            setSearchText(value);
                            fetchUsers();
                        }}
                        prefix={<SearchOutlined/>}
                    />
                    <UserRoleSelect
                        value={filterRole}
                        style={{width: 120}}
                        onChange={setFilterRole}
                        extraOptions={[{label: t('allRoles'), value: 'all'}]}
                    />
                    <UserStatusSelect
                        value={filterStatus}
                        style={{width: 120}}
                        onChange={setFilterStatus}
                        extraOptions={[{value: 'all', label: t('allStatus')}]}
                    />
                    <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                        {t('addUser')}
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
                    columns={columns}
                    dataSource={users}
                    loading={loading}
                    pagination={false}
                    rowKey={record => 'user_' + record.id}
                />

                <div className="flex justify-between items-center mt-4">
                    <div className="grow flex flex-row gap-x-4">
                        <Select
                            className="w-40"
                            defaultValue=""
                            placeholder={t('batchAction')}
                            onChange={(value) => setBatchAction(value)}
                            options={[
                                {label: t('batchAction'), value: ''},
                                {label: t('batchDelete'), value: 'delete'},
                            ]}
                        />
                        <Button type="primary" disabled={selectedItems.length === 0}>{t('apply')}</Button>
                    </div>
                    <Pagination
                        total={total}
                        pageSize={20}
                        showSizeChanger={false}
                        showTotal={(total) => `${t('total')} ${total} ${t('records')}`}
                        onChange={(page, pageSize) => {
                            setOffset((page - 1) * pageSize);
                        }}
                    />
                </div>
            </Card>
        </div>
    );
}
