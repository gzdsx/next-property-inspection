'use client';

import React from 'react';
import {Image, Button} from 'antd';
import {PlusOutlined, DeleteOutlined} from '@ant-design/icons';
import SortableContainer from '@/components/common/SortableContainer';
import {useBackendApp} from "@/contexts/BackendAppContext";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {arrayMove} from "@dnd-kit/sortable";


export interface ImageItem {
    id: string | number;
    src: string | undefined;
}

interface ImagesInputProps {
    value?: ImageItem[];
    onChange?: (value: ImageItem[]) => void;
    maxCount?: number;
    placeholder?: string;
}

const ImagesInput: React.FC<ImagesInputProps> = ({
                                                     value = [],
                                                     onChange,
                                                     maxCount = 5,
                                                 }) => {
    const {mediaLibrary} = useBackendApp();
    const {t} = useTranslations('products');

    const handleOpenMediaLibrary = () => {
        mediaLibrary.open({
            multiple: true,
            onSelect: (medias) => {
                const newUrls = medias.map(m => ({id: 0, src: m.src}));
                const merged = [...value, ...newUrls].slice(0, maxCount);
                onChange?.(merged);
            }
        });
    };

    const handleRemoveImage = (index: number) => {
        const newValue = value.filter((_, i) => i !== index);
        onChange?.(newValue);
    };

    const handleReplaceImage = (index: number) => {
        mediaLibrary.open({
            multiple: false,
            onSelect: (medias) => {
                if (medias.length) {
                    const newValue = [...value];
                    newValue[index].src = medias[0].src;
                    onChange?.(newValue);
                }
            }
        });
    };

    const handleSortEnd = (oldIndex: number, newIndex: number) => {
        onChange?.(arrayMove(value, oldIndex, newIndex));
    };

    return (
        <div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                <SortableContainer onSortEnd={handleSortEnd}>
                    {value.map((image, index) => (
                        <div id={`image-${index}`} key={`image-${index}-${image.src}`}
                             style={{position: 'relative', borderRadius: 4}}>
                            {
                                index === 0 && (
                                    <div style={{
                                        opacity: index === 0 ? 1 : 0,
                                        position: 'absolute', top: 0, left: 0,
                                        background: '#1890ff', color: '#fff', fontSize: 10,
                                        padding: '0 6px', borderRadius: '4px 0 4px 0', zIndex: 1, lineHeight: '18px',
                                    }}>
                                        {t('mainImage')}
                                    </div>
                                )
                            }
                            <div
                                data-img-container
                                style={{
                                    position: 'relative', borderRadius: 4, overflow: 'hidden',
                                    border: '1px solid #f0f0f0', width: 80, height: 80, cursor: 'grab',
                                }}
                            >
                                <Image
                                    src={image.src}
                                    alt={`Image ${index + 1}`}
                                    width={80}
                                    height={80}
                                    style={{objectFit: 'cover', borderRadius: '4px', pointerEvents: 'none'}}
                                    preview={false}
                                />
                                <div
                                    style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(0,0,0,0.6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: 0, transition: 'opacity 0.3s',
                                        pointerEvents: 'none',
                                    }}
                                    className="img-action-overlay"
                                >
                                    <Button
                                        type="primary"
                                        size="small"
                                        icon={<PlusOutlined/>}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReplaceImage(index);
                                        }}
                                        style={{marginRight: 4, fontSize: 12, pointerEvents: 'auto'}}
                                    />
                                    <Button
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined/>}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveImage(index);
                                        }}
                                        style={{fontSize: 12, pointerEvents: 'auto'}}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </SortableContainer>
                {value.length < maxCount && (
                    <div
                        style={{
                            width: 80, height: 80,
                            border: '1px dashed #d9d9d9', borderRadius: 4,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', background: '#fafafa',
                            transition: 'all 0.3s',
                        }}
                        onClick={handleOpenMediaLibrary}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#1890ff';
                            e.currentTarget.style.background = '#f0f9ff';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#d9d9d9';
                            e.currentTarget.style.background = '#fafafa';
                        }}
                    >
                        <PlusOutlined style={{fontSize: 20, color: '#d9d9d9'}}/>
                        <div style={{fontSize: 12, color: '#999', marginTop: 4}}>
                            {value.length}/{maxCount}
                        </div>
                    </div>
                )}
            </div>
            <div style={{fontSize: 12, color: '#999', marginTop: 8}}>
                {t('imagesTip', {maxCount})}
            </div>
            <style>{`
                [data-img-container]:hover .img-action-overlay {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
};

export default ImagesInput;
