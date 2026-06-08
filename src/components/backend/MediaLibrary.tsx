'use client';

import React, {useState, useEffect, useCallback} from 'react';
import {
    App,
    Modal,
    Upload,
    Button,
    Image,
    Row,
    Col,
    Input,
    Space,
    Select,
    Divider,
    Typography,
    Progress,
    Spin
} from 'antd';
import {
    SearchOutlined,
    DeleteOutlined,
    CheckOutlined,
    PictureOutlined,
    FileImageOutlined,
    VideoCameraOutlined,
    CalendarOutlined,
    FileOutlined,
    CloudUploadOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import type {UploadProps} from 'antd';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import {apiGet, apiDelete, apiPost} from "@/lib/backendApi";

const {Text, Paragraph} = Typography;

// API 返回的数据接口
export interface MediaType {
    id?: number;
    uid?: string;
    name?: string;
    src?: string;
    url?: string;
    thumbnail?: string;
    type?: 'image' | 'video';
    size?: number;
    created_at?: string;
    updated_at?: string;
}

interface ApiResponse {
    data?: {
        total?: number;
        items?: MediaType[];
    };
}

interface MediaLibraryProps {
    open: boolean;
    onClose?: () => void;
    onSelect?: (medias: MediaType[]) => void;
    multiple?: boolean;
}

export default function MediaLibrary({
                                         open = false,
                                         onClose,
                                         onSelect,
                                         multiple = false,
                                     }: MediaLibraryProps) {
    const {message} = App.useApp();
    const {t} = useTranslations('mediaLibrary');
    const {t: tCommon} = useTranslations('common');
    const [mediaList, setMediaList] = useState<MediaType[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<MediaType | null>(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadFileName, setUploadFileName] = useState('');
    const [uploadQueue, setUploadQueue] = useState<File[]>([]);
    const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
    const [totalUploadCount, setTotalUploadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [selectedMediaList, setSelectedMediaList] = useState<MediaType[]>([]);
    const [requestId, setRequestId] = useState("");

    // 确保组件只在客户端渲染
    useEffect(() => {
        setMounted(true);
    }, []);

    // 从 API 获取媒体列表
    const fetchMediaList = useCallback(async () => {
        if (!open) return;

        setLoading(true);
        try {
            const response = await apiGet('/materials', {
                offset,
                limit: 126,
                type: filterType === 'all' ? '' : filterType,
                q: searchKeyword
            }) as ApiResponse;
            const {total, items} = response.data as { total: number; items: MediaType[] }
            setTotal(total);
            if (loadingMore) {
                setMediaList(prev => [...prev, ...items]);
            } else {
                setMediaList([...items]);
            }
        } catch (error) {
            console.error('Failed to fetch media list:', error);
            const err = error as { message?: string };
            message.error(err?.message || t('fetchError') || '获取媒体列表失败');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [filterType, offset, open, searchKeyword, t, message, loadingMore]);

    // 组件打开时加载数据
    useEffect(() => {
        if (open && mounted) {
            fetchMediaList();
        }
    }, [offset, filterType, searchKeyword, open, mounted, requestId]);

    // 处理上传队列
    const processUploadQueue = useCallback(async () => {
        if (uploadQueue.length === 0 || uploading) return;

        setUploading(true);
        setUploadProgress(0);

        for (let i = currentUploadIndex; i < uploadQueue.length; i++) {
            const file = uploadQueue[i];
            setCurrentUploadIndex(i);
            setUploadFileName(file.name);
            setUploadProgress(0);

            try {
                const formData = new FormData();
                formData.append('file', file);

                // 模拟上传进度
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 10;
                    setUploadProgress(progress);
                    if (progress >= 90) {
                        clearInterval(interval);
                    }
                }, 100);

                const response = await apiPost('/materials', formData) as { data: MediaType };

                clearInterval(interval);
                setUploadProgress(100);

                // 添加新上传的文件到列表
                const newMedia = response.data;
                setMediaList(prev => [newMedia, ...prev]);

                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error('Upload failed:', error);
                const err = error as Error;
                message.error(`${file.name}: ${err?.message || t('uploadError') || '上传失败'}`);
            }
        }

        // 所有文件上传完成
        message.success(t('uploadSuccess'));
        setUploading(false);
        setUploadProgress(0);
        setUploadFileName('');
        setUploadQueue([]);
        setCurrentUploadIndex(0);
        setTotalUploadCount(0);
    }, [uploadQueue, currentUploadIndex, uploading, t, message]);

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: true,
        accept: '*',
        showUploadList: false,
        beforeUpload: (file, fileList) => {
            const isLt100M = file.size / 1024 / 1024 < 100;
            if (!isLt100M) {
                message.error(`${file.name}: ${t('fileSizeLimit')}`);
                return false;
            }

            // 将文件添加到队列
            setUploadQueue(prev => [...prev, file]);
            setTotalUploadCount(prev => prev + 1);

            return false; // 阻止自动上传
        },
    };

    const handleSelect = (media: MediaType) => {
        setSelectedMedia(media);
        if (multiple) {
            if (selectedMediaList.includes(media)) {
                setSelectedMediaList(prev => prev.filter(item => item.id !== media.id));
            } else {
                setSelectedMediaList(prev => [...prev, media]);
            }
        } else {
            setSelectedMediaList(prev => [media]);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: number | undefined) => {
        e.stopPropagation();

        try {
            await apiDelete(`/materials/${id}`);
            setMediaList(prev => prev.filter(item => item.id !== id));
            if (selectedMedia?.id === id) {
                setSelectedMedia(null);
            }
            message.success(t('deleteSuccess'));
        } catch (error) {
            console.error('Failed to delete media:', error);
            const err = error as { message?: string };
            message.error(err?.message || t('deleteError') || '删除失败');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    };

    const handleClose = () => {
        onClose?.();
    }

    // 监听队列变化，开始处理
    useEffect(() => {
        if (uploadQueue.length > 0 && !uploading) {
            processUploadQueue();
        }
    }, [uploadQueue, uploading]);

    // 如果未挂载，返回 null 避免 hydration 错误
    if (!mounted) return null;

    return (
        <Modal
            title={t('title')}
            open={open}
            onCancel={handleClose}
            width={1320}
            footer={
                <Space>
                    <Button onClick={onClose}>{tCommon('cancel')}</Button>
                    <Button
                        type="primary"
                        onClick={() => {
                            if (selectedMediaList.length) {
                                onSelect?.(selectedMediaList);
                                setSelectedMediaList([]);
                                handleClose();
                            }
                        }}
                        disabled={!selectedMediaList.length}
                    >
                        {t('confirmSelect')}
                    </Button>
                </Space>
            }
        >
            <div className="media-library">
                {/* 工具栏 */}
                <div className="media-toolbar"
                     style={{
                         marginBottom: 16,
                         display: 'flex',
                         justifyContent: 'space-between',
                         alignItems: 'center',
                         flexWrap: 'wrap',
                         gap: 8
                     }}>
                    {/* 左侧：搜索和类型选择 */}
                    <Space wrap>
                        <Select
                            value={filterType}
                            onChange={(value) => {
                                setOffset(0);
                                setFilterType(value as 'all' | 'image' | 'video');
                            }}
                            style={{width: 120}}
                            options={[
                                {value: 'all', label: t('all')},
                                {value: 'image', label: t('image')},
                                {value: 'video', label: t('video')},
                                {value: 'voice', label: t('voice')},
                                {value: 'doc', label: t('document')},
                                {value: 'file', label: t('other')},
                            ]}
                        />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            prefix={<SearchOutlined/>}
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            style={{width: 200}}
                            allowClear
                        />
                        <Button
                            icon={<ReloadOutlined spin={loading}/>}
                            onClick={() => {
                                setOffset(0);
                                setRequestId(Date.now().toString());
                            }}
                            loading={loading}
                        >
                            {t('refresh') || '刷新'}
                        </Button>
                    </Space>

                    {/* 右侧：上传按钮 */}
                    <Space>
                        <Upload {...uploadProps}>
                            <Button
                                type="primary"
                                icon={<CloudUploadOutlined/>}
                                loading={uploading}
                            >
                                {t('uploadFile')}
                            </Button>
                        </Upload>
                    </Space>
                </div>

                {/* 上传进度条 */}
                {uploading && uploadProgress >= 0 && (
                    <div style={{marginBottom: 16, padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: 8}}>
                        <Space orientation="vertical" style={{width: '100%'}} size={4}>
                            <Space>
                                <CloudUploadOutlined style={{color: '#1890ff'}}/>
                                <Text type="secondary" style={{fontSize: 13}}>
                                    {t('uploading')}: {uploadFileName} ({currentUploadIndex + 1}/{totalUploadCount})
                                </Text>
                            </Space>
                            <Progress
                                percent={uploadProgress}
                                size="small"
                                status={uploadProgress < 100 ? 'active' : 'success'}
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                            />
                        </Space>
                    </div>
                )}

                {/* 内容区域 */}
                <Row gutter={16}>
                    {/* 媒体网格 - 左侧 */}
                    <Col span={18}>
                        <Spin spinning={loading} description={t('loading') || '加载中...'}>
                            <div className="media-grid" style={{
                                minHeight: 450,
                                maxHeight: 500,
                                overflowY: 'auto',
                                border: '1px solid #f0f0f0',
                                borderRadius: 8,
                                padding: 16
                            }}>
                                {mediaList.length === 0 ? (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: 400,
                                        color: '#999'
                                    }}>
                                        {loading ? (t('loading') || '加载中...') : t('noMedia')}
                                    </div>
                                ) : (
                                    <Row gutter={[12, 12]}>
                                        {mediaList.map((item: MediaType) => (
                                            <Col key={'media_' + item.id} xs={12} sm={8} md={6} lg={4}>
                                                <div
                                                    className={`media-item ${selectedMediaList.includes(item) ? 'selected' : ''}`}
                                                    onClick={() => handleSelect(item)}
                                                    style={{
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        border: selectedMediaList.includes(item) ? '2px solid #1890ff' : '2px solid transparent',
                                                        borderRadius: 8,
                                                        overflow: 'hidden',
                                                        backgroundColor: '#f5f5f5',
                                                        transition: 'all 0.3s'
                                                    }}
                                                >
                                                    <Image
                                                        src={item.thumbnail}
                                                        alt={item.name}
                                                        width="100%"
                                                        height={100}
                                                        style={{objectFit: 'cover'}}
                                                        preview={false}
                                                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                                                    />

                                                    {/* 选中标记 */}
                                                    {selectedMediaList.includes(item) && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                top: 4,
                                                                right: 4,
                                                                backgroundColor: '#1890ff',
                                                                color: '#fff',
                                                                borderRadius: '50%',
                                                                width: 24,
                                                                height: 24,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <CheckOutlined style={{fontSize: 14}}/>
                                                        </div>
                                                    )}

                                                    {/* 文件信息 */}
                                                    <div style={{padding: 6}}>
                                                        <div
                                                            style={{
                                                                fontSize: 11,
                                                                fontWeight: 500,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                marginBottom: 2
                                                            }}
                                                            title={item.name}
                                                        >
                                                            {item.name}
                                                        </div>
                                                        <div style={{fontSize: 10, color: '#999'}}>
                                                            {formatFileSize(item.size || 0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Col>
                                        ))}
                                        {
                                            mediaList.length < total ? (
                                                <Col span={24}>
                                                    <div style={{textAlign: 'center'}}>
                                                        <Button type="link" onClick={() => {
                                                            setOffset(offset + 126);
                                                            setLoadingMore(true);
                                                        }}>
                                                            {loadingMore ? (t('loading') || '加载中...') : t('loadMore')}
                                                        </Button>
                                                    </div>
                                                </Col>
                                            ) : null
                                        }
                                    </Row>
                                )}
                            </div>
                        </Spin>
                    </Col>

                    {/* 媒体详情 - 右侧 */}
                    <Col span={6}>
                        <div style={{
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            padding: 16,
                            height: 500,
                            overflowY: 'auto'
                        }}>
                            {selectedMedia ? (
                                <div>
                                    <div style={{marginBottom: 16}}>
                                        <Text strong style={{fontSize: 16}}>{t('selectedMedia')}</Text>
                                    </div>

                                    {/* 预览 */}
                                    <div style={{marginBottom: 16, textAlign: 'center'}}>
                                        {selectedMedia.type === 'image' ? (
                                            <Image
                                                src={selectedMedia.thumbnail}
                                                alt={selectedMedia.name}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: 200,
                                                    objectFit: 'contain',
                                                    borderRadius: 4
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                height: 150,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#000',
                                                borderRadius: 4
                                            }}>
                                                <VideoCameraOutlined style={{fontSize: 48, color: '#fff'}}/>
                                            </div>
                                        )}
                                    </div>

                                    <Divider style={{margin: '12px 0'}}/>

                                    {/* 详细信息 */}
                                    <div style={{marginBottom: 16}}>
                                        <Space orientation="vertical" style={{width: '100%'}} size={8}>
                                            <div>
                                                <Text type="secondary" style={{fontSize: 12}}>
                                                    {t('fileName')}:
                                                </Text>
                                                <br/>
                                                <Text strong style={{wordBreak: 'break-all'}}>
                                                    {selectedMedia.name}
                                                </Text>
                                            </div>

                                            <div>
                                                <Text type="secondary" style={{fontSize: 12}}>
                                                    {t('fileType')}:
                                                </Text>
                                                <br/>
                                                <Space>
                                                    {selectedMedia.type === 'image' ? (
                                                        <><FileImageOutlined/> {t('image')}</>
                                                    ) : (
                                                        <><VideoCameraOutlined/> {t('video')}</>
                                                    )}
                                                </Space>
                                            </div>

                                            <div>
                                                <Text type="secondary" style={{fontSize: 12}}>
                                                    {t('fileSize')}:
                                                </Text>
                                                <br/>
                                                <Space>
                                                    <FileOutlined/>
                                                    <Text>{formatFileSize(selectedMedia.size || 0)}</Text>
                                                </Space>
                                            </div>

                                            <div>
                                                <Text type="secondary" style={{fontSize: 12}}>
                                                    {t('uploadDate')}:
                                                </Text>
                                                <br/>
                                                <Space>
                                                    <CalendarOutlined/>
                                                    <Text>{selectedMedia.created_at}</Text>
                                                </Space>
                                            </div>

                                            <div>
                                                <Text type="secondary" style={{fontSize: 12}}>
                                                    {t('fileUrl')}:
                                                </Text>
                                                <br/>
                                                <Paragraph
                                                    copyable={{
                                                        text: selectedMedia.thumbnail,
                                                        tooltips: [t('copyUrl'), t('copied')],
                                                        onCopy: () => message.success(t('copySuccess'))
                                                    }}
                                                    style={{
                                                        margin: 0,
                                                        fontSize: 11,
                                                        wordBreak: 'break-all',
                                                        color: '#1890ff'
                                                    }}
                                                >
                                                    {selectedMedia.thumbnail}
                                                </Paragraph>
                                            </div>
                                        </Space>
                                    </div>

                                    <Divider style={{margin: '12px 0'}}/>

                                    {/* 操作按钮 */}
                                    <Space orientation="vertical" style={{width: '100%'}}>
                                        <Button
                                            block
                                            icon={<DeleteOutlined/>}
                                            danger
                                            onClick={(e) => handleDelete(e, selectedMedia.id)}
                                        >
                                            {tCommon('delete')}
                                        </Button>
                                    </Space>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    height: '100%',
                                    color: '#999'
                                }}>
                                    <PictureOutlined style={{fontSize: 48, marginBottom: 16}}/>
                                    <Text type="secondary">{t('noMediaSelected')}</Text>
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>

                <style jsx global>{`
                    .media-item:hover .delete-btn {
                        opacity: 1 !important;
                    }

                    .media-item:hover {
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    }
                `}</style>
            </div>
        </Modal>
    );
}
