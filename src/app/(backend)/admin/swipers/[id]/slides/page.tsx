'use client';

import React, {useState, useEffect} from 'react';
import {
    Card,
    Button,
    Input,
    Modal,
    Form,
    App,
    Popconfirm,
    Image,
    Empty,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    HolderOutlined,
    ArrowLeftOutlined,
} from '@ant-design/icons';
import {useParams, useRouter} from 'next/navigation';
import {apiGet, apiPost, apiPut, apiDelete} from '@/lib/backendApi';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import {useSortable} from '@dnd-kit/react/sortable';
import SortableProvider from '@/components/common/SortableProvider';
import {arrayMove} from '@dnd-kit/sortable';
import FeaturedImageInput from '@/components/backend/FeaturedImageInput';

interface SlideType {
    id: number;
    title: string;
    image: string;
    description: string;
    link: string;
    sort_num: number;
}

function SortableSlideCard({
                               id,
                               index,
                               slide,
                               onEdit,
                               onDelete,
                           }: {
    id: string;
    index: number;
    slide: SlideType;
    onEdit: (slide: SlideType) => void;
    onDelete: (id: number) => void;
}) {
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('swipers');
    const handleRef = React.useRef<HTMLDivElement>(null);
    const {ref, isDragging} = useSortable({
        id,
        index,
        handle: handleRef,
        transition: {duration: 250, easing: 'ease'},
    });

    return (
        <div
            ref={ref}
            style={{
                marginBottom: 12,
                opacity: isDragging ? 0.6 : 1,
                border: isDragging ? '1px dashed #1890ff' : '1px solid #f0f0f0',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: '#fff',
            }}
        >
            <div
                ref={handleRef}
                style={{cursor: 'grab', color: '#999', fontSize: 18, flexShrink: 0}}
            >
                <HolderOutlined/>
            </div>

            {slide.image ? (
                <Image
                    src={slide.image}
                    alt={slide.title}
                    width={80}
                    height={60}
                    style={{objectFit: 'cover', borderRadius: 4, flexShrink: 0}}
                    preview={false}
                />
            ) : (
                <div style={{
                    width: 80, height: 60, background: '#fafafa', borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ccc', fontSize: 12, flexShrink: 0, border: '1px dashed #d9d9d9',
                }}>
                    {t('noImage')}
                </div>
            )}

            <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontWeight: 500, marginBottom: 4}}>{slide.title || '-'}</div>
                {slide.description && (
                    <div style={{color: '#999', fontSize: 13, marginBottom: 2}}>
                        {slide.description}
                    </div>
                )}
                {slide.link && (
                    <div style={{
                        color: '#1890ff',
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {slide.link}
                    </div>
                )}
            </div>

            <div style={{display: 'flex', gap: 8, flexShrink: 0}}>
                <Button type="link" size="small" icon={<EditOutlined/>} onClick={() => onEdit(slide)}>
                    {tc('edit')}
                </Button>
                <Popconfirm
                    title={t('deleteSlideConfirm')}
                    onConfirm={() => onDelete(slide.id)}
                    okText={tc('confirm')}
                    cancelText={tc('cancel')}
                >
                    <Button type="link" size="small" danger icon={<DeleteOutlined/>}>
                        {tc('delete')}
                    </Button>
                </Popconfirm>
            </div>
        </div>
    );
}

export default function SlidesManagement() {
    const params = useParams();
    const router = useRouter();
    const swiperId = params.id as string;

    const [slides, setSlides] = useState<SlideType[]>([]);
    const [swiperTitle, setSwiperTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSlide, setEditingSlide] = useState<SlideType | null>(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('swipers');

    const fetchSlides = () => {
        setLoading(true);
        apiGet(`/swipers/${swiperId}/slides`).then(res => {
            setSlides(res.data?.items || []);
            setSwiperTitle(res.data?.swiper?.title || '');
        }).catch(reason => {
            message.error(reason.message || t('fetchError'));
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchSlides();
    }, [swiperId]);

    const handleAdd = () => {
        setEditingSlide(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (slide: SlideType) => {
        setEditingSlide(slide);
        form.setFieldsValue({
            title: slide.title,
            image: slide.image,
            description: slide.description,
            link: slide.link,
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const slideData = {
                ...values,
                thumbnail: values.image,
            }
            setSubmitting(true);
            if (editingSlide) {
                await apiPut(`/swipers/${swiperId}/slides/${editingSlide.id}`, slideData);
                message.success(t('updateSuccess'));
            } else {
                await apiPost(`/swipers/${swiperId}/slides`, slideData);
                message.success(t('createSuccess'));
            }
            setModalVisible(false);
            fetchSlides();
        } catch (error: unknown) {
            if (error instanceof Error) {
                message.error(error.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await apiDelete(`/swipers/${swiperId}/slides/${id}`);
            message.success(t('deleteSuccess'));
            fetchSlides();
        } catch (error: unknown) {
            if (error instanceof Error) message.error(error.message);
        }
    };

    const handleSortEnd = (oldIndex: number, newIndex: number) => {
        const newSlides = arrayMove(slides, oldIndex, newIndex).map((s, i) => ({
            ...s,
            sort_num: i,
        }));
        setSlides(newSlides);

        apiPut(`/swipers/${swiperId}/slides/reorder`, {
            orders: newSlides.map(s => ({id: s.id, sort_num: s.sort_num})),
        }).then(() => {
            message.success(t('sortSuccess'));
        }).catch(() => {
            message.error(t('sortError'));
            fetchSlides();
        });
    };

    return (
        <div>
            <div style={{marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16}}>
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined/>}
                    onClick={() => router.push('/admin/swipers')}
                />
                <h2 style={{fontSize: 24, fontWeight: 'bold', margin: 0}}>
                    {swiperTitle} - {t('slideManagement')}
                </h2>
            </div>

            <Card>
                <div style={{marginBottom: 16}}>
                    <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                        {t('addSlide')}
                    </Button>
                </div>

                {slides.length === 0 && !loading ? (
                    <Empty description={t('noSlides')}/>
                ) : (
                    <SortableProvider onSortEnd={handleSortEnd}>
                        {slides.map((slide, index) => (
                            <SortableSlideCard
                                key={`slide-${slide.id}`}
                                id={`slide-${slide.id}`}
                                index={index}
                                slide={slide}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </SortableProvider>
                )}
            </Card>

            <Modal
                title={editingSlide ? t('editSlide') : t('addSlide')}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                confirmLoading={submitting}
                width={560}
                okText={tc('save')}
                cancelText={tc('cancel')}
            >
                <Form form={form} layout="vertical" style={{marginTop: 16}}>
                    <Form.Item name="image" label={t('slideImage')}>
                        <FeaturedImageInput placeholder={t('slideImagePlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        name="title"
                        label={t('slideTitle')}
                        rules={[{required: true, message: t('slideTitlePlaceholder')}]}
                    >
                        <Input placeholder={t('slideTitlePlaceholder')}/>
                    </Form.Item>

                    <Form.Item name="description" label={t('slideDescription')}>
                        <Input.TextArea rows={3} placeholder={t('slideDescriptionPlaceholder')}/>
                    </Form.Item>

                    <Form.Item name="link" label={t('slideLink')}>
                        <Input placeholder={t('slideLinkPlaceholder')}/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
