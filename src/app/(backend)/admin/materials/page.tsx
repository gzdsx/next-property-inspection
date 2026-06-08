'use client';

import React, {useState, useEffect} from 'react';
import {
    Table,
    Card,
    Button,
    Tag,
    Input,
    Select,
    Pagination,
    Modal,
    Form,
    App,
    Popconfirm,
    Image as AntImage,
} from 'antd';
import {
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import {apiGet, apiPut, apiDelete} from "@/lib/backendApi";
import {useTranslations} from '@/contexts/BackendLocaleContext';
import BatchUploader from '@/components/backend/BatchUploader';

const {Search} = Input;

interface MaterialType {
    id: number;
    name: string;
    type: string;
    url: string;
    thumbnail: string;
    size: number;
    description: string;
    user: { name: string };
    created_at: string;
}

function formatFileSize(size: number) {
    if (!size) return '-';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function MaterialsManagement() {
    const [total, setTotal] = useState<number>(0);
    const [items, setItems] = useState<MaterialType[]>([]);
    const [offset, setOffset] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [selectedItems, setSelectedItems] = useState<React.Key[]>([]);
    const [batchAction, setBatchAction] = useState<string>('');

    // Edit modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<MaterialType | null>(null);
    const [editForm] = Form.useForm();
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Upload modal
    const [uploadModalVisible, setUploadModalVisible] = useState(false);

    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('materials');

    const fetchMaterials = () => {
        setLoading(true);
        apiGet('/materials', {
            q: searchText,
            type: filterType === 'all' ? '' : filterType,
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
        fetchMaterials();
    }, [offset, filterType]);

    // --- Edit ---
    const handleEdit = (record: MaterialType) => {
        setEditingItem(record);
        editForm.setFieldsValue({
            name: record.name,
            description: record.description || '',
        });
        setEditModalVisible(true);
    };

    const handleEditSave = async () => {
        try {
            const values = await editForm.validateFields();
            setEditSubmitting(true);
            await apiPut(`/materials/${editingItem!.id}`, values);
            message.success(t('updateSuccess'));
            setEditModalVisible(false);
            fetchMaterials();
        } catch (error: unknown) {
            if (error instanceof Error) {
                message.error(error.message);
            }
        } finally {
            setEditSubmitting(false);
        }
    };

    // --- Upload ---
    const handleUploadComplete = () => {
        fetchMaterials();
        setUploadModalVisible(false);
    };

    // --- Batch ---
    const handleBatchAction = () => {
        if (!batchAction) return;

        if (batchAction === 'delete') {
            setLoading(true);
            apiDelete('/materials/batch', {ids: selectedItems as number[]}).then(() => {
                message.success(t('deleteSuccess'));
                fetchMaterials();
            }).catch(reason => {
                message.error(reason.message);
            }).finally(() => {
                setSelectedItems([]);
                setLoading(false);
            });
        }
    };

    const columns: ColumnsType<MaterialType> = [
        {
            title: t('thumbnail'),
            dataIndex: 'thumbnail',
            key: 'thumbnail',
            width: 80,
            render: (url: string) => url ? (
                <AntImage src={url} width={48} height={48} style={{objectFit: 'cover', borderRadius: 4}}/>
            ) : '-',
        },
        {
            title: t('name'),
            dataIndex: 'name',
            key: 'name',
            width: 'auto',
            render: (name: string, record) => (
                <div>
                    <strong className="text-gray-600">{name}</strong>
                    <div style={{marginTop: 4}}>
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined/>}
                            onClick={() => handleEdit(record)}
                            className="px-0"
                            style={{paddingLeft: 0}}
                        >
                            {tc('edit')}
                        </Button>
                        <Popconfirm
                            title={t('deleteMaterialConfirm')}
                            onConfirm={async () => {
                                try {
                                    await apiDelete(`/materials/${record.id}`);
                                    message.success(t('deleteSuccess'));
                                    fetchMaterials();
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
            title: t('type'),
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (type: string) => {
                const colorMap: Record<string, string> = {image: 'blue', video: 'purple', voice: 'orange', doc: 'green', file: 'default'};
                return <Tag color={colorMap[type] || 'default'}>{t(type) || type}</Tag>;
            },
        },
        {
            title: t('size'),
            dataIndex: 'size',
            key: 'size',
            width: 100,
            render: (size: number) => formatFileSize(size),
        },
        {
            title: t('user'),
            dataIndex: ['user', 'name'],
            key: 'user',
            width: 120,
        },
        {
            title: tc('createdAt'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
        },
    ];

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{t('materialManagement')}</h2>
            <Card>
                <div style={{marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{width: 250}}
                        onSearch={(value) => {
                            setSearchText(value);
                            fetchMaterials();
                        }}
                        prefix={<SearchOutlined/>}
                    />
                    <Select defaultValue="all" style={{width: 120}} onChange={(value) => setFilterType(value)}
                        options={[
                            {value: 'all', label: t('allTypes')},
                            {value: 'image', label: t('image')},
                            {value: 'video', label: t('video')},
                            {value: 'voice', label: t('voice')},
                            {value: 'doc', label: t('doc')},
                            {value: 'file', label: t('file')},
                        ]}
                    />
                    <Button type="primary" icon={<UploadOutlined/>} onClick={() => setUploadModalVisible(true)}>
                        {t('uploadMaterial')}
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
                        <Select className="w-40" defaultValue="" placeholder={tc('batchAction')}
                                onChange={(value) => setBatchAction(value)}
                                options={[
                                    {value: '', label: tc('batchAction')},
                                    {value: 'delete', label: tc('delete')},
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

            {/* Edit Modal */}
            <Modal
                title={t('editMaterial')}
                open={editModalVisible}
                onOk={handleEditSave}
                onCancel={() => setEditModalVisible(false)}
                confirmLoading={editSubmitting}
                width={480}
                okText={tc('save')}
                cancelText={tc('cancel')}
            >
                <Form form={editForm} layout="vertical" style={{marginTop: 16}}>
                    <Form.Item
                        name="name"
                        label={t('name')}
                        rules={[{required: true, message: t('namePlaceholder')}]}
                    >
                        <Input placeholder={t('namePlaceholder')}/>
                    </Form.Item>
                    <Form.Item name="description" label={t('description')}>
                        <Input.TextArea rows={3} placeholder={t('descriptionPlaceholder')}/>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Upload Modal */}
            <Modal
                title={t('uploadMaterial')}
                open={uploadModalVisible}
                onCancel={() => setUploadModalVisible(false)}
                width={640}
                footer={null}
            >
                <BatchUploader
                    uploadUrl={`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/materials`}
                    i18n={{
                        selectFiles: t('selectFiles'),
                        dragHint: t('dragHint'),
                        uploadError: t('uploadError'),
                        uploadComplete: t('uploadComplete'),
                        uploaded: t('uploaded'),
                        pending: t('pending'),
                        pause: t('pause'),
                        resume: t('resume'),
                        uploadStats: (params) => t('uploadStats', params),
                    }}
                    onComplete={handleUploadComplete}
                />
            </Modal>
        </div>
    );
}
