'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Checkbox, Input, Spin, App} from 'antd';
import {SearchOutlined} from '@ant-design/icons';
import {apiGet} from '@/lib/backendApi';

interface VariantOption {
    id: string;
    title: string;
}

interface ProductVariant {
    id: number;
    name: string;
    options: VariantOption[];
}

interface ProductVariantModalProps {
    open: boolean;
    onClose?: () => void;
    onSelect?: (variant: { name: string; options: VariantOption[] }) => void;
}

const ProductVariantModal: React.FC<ProductVariantModalProps> = ({open, onClose, onSelect}) => {
    const {message} = App.useApp();
    const [loading, setLoading] = useState(false);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<VariantOption[]>([]);

    const fetchVariants = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (searchKeyword) {
                params.keyword = searchKeyword;
            }
            const res = await apiGet('/product-variants', params);
            setVariants(res?.data.items || []);
            setSelectedVariant({...res?.data.items[0]});
        } catch (e: unknown) {
            if (e instanceof Error) message.error(e?.message || '获取型号数据失败');
        } finally {
            setLoading(false);
        }
    }, [searchKeyword, message]);

    useEffect(() => {
        if (open) {
            fetchVariants();
        }
    }, [open, fetchVariants]);

    // 点击左侧型号（单选）
    const handleOptionCheck = (option: VariantOption) => {
        if (selectedOptions.includes(option)) {
            setSelectedOptions(prev => prev.filter(item => item.title !== option.title));
        } else {
            setSelectedOptions(prev => [...prev, option]);
        }
    };

    const handleOk = () => {
        onSelect?.({
            name: selectedVariant?.name || '',
            options: selectedOptions
        });
        handleReset();
    };

    const handleReset = () => {
        setSearchKeyword('');
        setSelectedVariant(null);
        setSelectedOptions([]);
    };

    const handleCancel = () => {
        handleReset();
        onClose?.();
    };

    return (
        <Modal
            title="选择常用型号"
            open={open}
            width={800}
            onOk={handleOk}
            onCancel={handleCancel}
            okText="确认"
            cancelText="取消"
            destroyOnHidden
        >
            <Input
                placeholder="搜索型号"
                prefix={<SearchOutlined/>}
                allowClear
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{marginBottom: 16}}
            />
            <Spin spinning={loading}>
                <div style={{display: 'flex', border: '1px solid #f0f0f0', borderRadius: 6, minHeight: 360}}>
                    {/* 左侧：型号列表 */}
                    <div style={{width: 180, borderRight: '1px solid #f0f0f0', overflowY: 'auto', padding: 8}}>
                        {variants.length === 0 && !loading && (
                            <div style={{color: '#999', textAlign: 'center', padding: 24}}>暂无数据</div>
                        )}
                        {variants.map(variant => (
                            <div
                                key={variant.id}
                                onClick={() => setSelectedVariant(variant)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderRadius: 4,
                                    background: selectedVariant?.id === variant.id ? '#e6f4ff' : 'transparent',
                                    marginBottom: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <span style={{marginLeft: 8}}>{variant.name}</span>
                            </div>
                        ))}
                    </div>
                    {/* 右侧：选项列表 */}
                    <div style={{flex: 1, overflowY: 'auto', padding: 12}}>
                        {selectedVariant == null && (
                            <div style={{color: '#999', textAlign: 'center', padding: 24}}>请在左侧选择型号</div>
                        )}
                        {selectedVariant != null && (() => {
                            return (
                                <div>
                                    <div style={{fontWeight: 500, marginBottom: 8, color: '#1677ff'}}>
                                        {selectedVariant.name}
                                    </div>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                                        {selectedVariant.options.map((option, index) => (
                                            <Checkbox
                                                key={`option-${index}`}
                                                checked={selectedOptions.includes(option)}
                                                onChange={e => handleOptionCheck(option)}
                                            >
                                                {option.title}
                                            </Checkbox>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </Spin>
        </Modal>
    );
};

export type {ProductVariant, VariantOption};
export default ProductVariantModal;
