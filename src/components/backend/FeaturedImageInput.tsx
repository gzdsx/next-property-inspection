'use client';

import React from 'react';
import {Image, Button} from 'antd';
import {PlusOutlined, DeleteOutlined} from '@ant-design/icons';
import {useMediaLibrary} from "@/contexts/BackendAppContext";

interface FeaturedImageInputProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
}

const FeaturedImageInput: React.FC<FeaturedImageInputProps> = ({
                                                                   value,
                                                                   onChange,
                                                                   placeholder = '选择图片'
                                                               }) => {
    const mediaLibrary = useMediaLibrary();

    const handleOpenMediaLibrary = () => {
        mediaLibrary.open({
            multiple: false,
            onSelect: (medias) => {
                if (medias.length) onChange?.(medias[0].src as string);
            }
        });
    }

    const handleRemoveImage = () => {
        onChange?.('');
    };

    return (
        <div className="featured-image-input">
            {value ? (
                <div className="featured-image-preview">
                    <div className="image-wrapper">
                        <Image
                            src={value}
                            alt="Featured"
                            width="100%"
                            height={200}
                            style={{objectFit: 'cover', borderRadius: '4px'}}
                        />
                        <div className="image-overlay">
                            <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined/>}
                                onClick={handleOpenMediaLibrary}
                                style={{marginRight: 8}}
                            >
                                更换
                            </Button>
                            <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined/>}
                                onClick={handleRemoveImage}
                            >
                                移除
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className="featured-image-placeholder"
                    onClick={handleOpenMediaLibrary}
                    style={{
                        border: '1px dashed #d9d9d9',
                        borderRadius: '4px',
                        padding: '40px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#fafafa',
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#1890ff';
                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#d9d9d9';
                        e.currentTarget.style.backgroundColor = '#fafafa';
                    }}
                >
                    <PlusOutlined style={{fontSize: '24px', color: '#d9d9d9'}}/>
                    <div style={{marginTop: '8px', color: '#999'}}>{placeholder}</div>
                </div>
            )}

            <style jsx>{`
                .featured-image-preview {
                    position: relative;
                }

                .image-wrapper {
                    position: relative;
                    border-radius: 4px;
                    overflow: hidden;
                }

                .image-wrapper:hover .image-overlay {
                    opacity: 1;
                }

                .image-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s;
                }

                .featured-image-placeholder:hover {
                    border-color: #1890ff !important;
                    background-color: #f0f9ff !important;
                }
            `}</style>
        </div>
    );
};

export default FeaturedImageInput;
