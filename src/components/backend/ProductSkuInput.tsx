import React, {useEffect, useMemo, useState} from 'react';
import {Input, Button, Space, Card, Modal, Tag} from 'antd';
import {HolderOutlined, PlusOutlined} from '@ant-design/icons';
import {arrayMove} from "@dnd-kit/sortable";
import ProductVariantModal from './ProductVariantModal';
import SortableContainer from "@/components/common/SortableContainer";
import {useSortable} from '@dnd-kit/react/sortable';
import {DragDropProvider, DragOverlay} from '@dnd-kit/react';
import SortableProvider from "@/components/common/SortableProvider";

export interface SkuItem {
    id?: number;
    name: string;
    price: number;
    stock: number;
    code: string;
    properties: string;
}

export interface VariantItem {
    name: string;
    options: { id: string, title: string; }[];
}

export interface SkuOptionItem {
    key: string,
    value: string
}

export interface ProductSkuInputProps {
    value?: { skus: SkuItem[], variants: VariantItem[] };
    onChange?: (value: { skus: SkuItem[], variants: VariantItem[] }) => void;
}

function showColumn(showCounts: number[], row: number, col: number) {
    const maxCount = showCounts[showCounts.length - 1]; // 最多行的一列（即最后一列）
    if (col < showCounts.length - 1 && row !== 0) {
        // 在非第一行也不是最后一列只有在满足次条件才能显示
        return row % (maxCount / showCounts[col]) === 0;
    } else {
        // 第一行或最后一列都是直接显示即可
        return true;
    }
}

function SortableCard({id, index, children, title, extra}: {
    id: string,
    index: number,
    children: React.ReactNode,
    title?: React.ReactNode,
    extra?: React.ReactNode
}) {
    const handleRef = React.useRef<HTMLDivElement>(null);
    const {ref} = useSortable({
        id,
        index,
        handle: handleRef,
        transition: {duration: 250, easing: 'ease'},
    });

    return (
        <Card
            ref={ref}
            title={
                <Space>
                    <HolderOutlined ref={handleRef}/>
                    {title}
                </Space>
            }
            extra={extra}
            type={'inner'}
            style={{marginBottom: 16}}
        >{children}</Card>
    );
}

const SortableOption = ({id, index, children}: {
    id: string,
    index: number,
    children: React.ReactNode,
}) => {
    const {ref} = useSortable({
        id,
        index,
        transition: {duration: 250, easing: 'ease'},
    });
    return (
        <div ref={ref}>{children}</div>
    );
}

const ProductSkuInput: React.FC<ProductSkuInputProps> = ({value = {skus: [], variants: []}, onChange}) => {
    const [variants, setVariants] = useState<VariantItem[]>(value.variants);
    const [optionFormIsOpen, setOptionFormIsOpen] = useState(false);
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [optionTitle, setOptionTitle] = useState<string>('');
    const [skuOverrides, setSkuOverrides] = useState<Record<string, SkuItem>>({});
    const currentVariantIndexRef = React.useRef(0);
    const currentOptionIndexRef = React.useRef(0);
    const optionActionRef = React.useRef<'add' | 'edit'>('add');

    const handleAddVariant = () => {
        setVariants(prev => [...prev, {name: '', options: []}]);
    }

    const handleRemoveVariant = (index: number) => {
        setVariants(prev => prev.filter((_, i) => i !== index));
    }

    const handleUpdateVariant = (index: number, val: string) => {
        setVariants(prev => prev.map((item, i) => i === index ? {...item, name: val} : item));
    }

    const handleAddOption = (vIndex: number) => {
        optionActionRef.current = 'add';
        currentVariantIndexRef.current = vIndex;
        setOptionFormIsOpen(true);
    }

    const handleEditOption = (vIndex: number, oIndex: number) => {
        optionActionRef.current = 'edit';
        currentVariantIndexRef.current = vIndex;
        currentOptionIndexRef.current = oIndex;
        setOptionTitle(variants[vIndex].options[oIndex].title);
        setOptionFormIsOpen(true);
    }

    const handleSaveOption = () => {
        if (optionTitle.trim() === '') {
            return false;
        }

        if (optionActionRef.current === 'add') {
            const vIndex = currentVariantIndexRef.current;
            setVariants(prev => prev.map((item, i) => i === vIndex ? {
                ...item,
                options: [...item.options, {id: Date.now().toString(), title: optionTitle}]
            } : item));
            setOptionTitle('');
            setOptionFormIsOpen(false);
        }

        if (optionActionRef.current == 'edit') {
            const vIndex = currentVariantIndexRef.current;
            const oIndex = currentOptionIndexRef.current;
            setVariants(prev => prev.map((item, i) => i === vIndex ? {
                ...item,
                options: item.options.map((opt, j) => j === oIndex ? {...opt, title: optionTitle} : opt)
            } : item));
            setOptionTitle('');
            setOptionFormIsOpen(false);
        }
    }

    const handleRemoveOption = (vIndex: number, oIndex: number) => {
        setVariants(prev => {
            return prev.map((item, i) => {
                if (i === vIndex) {
                    return {
                        ...item,
                        options: item.options.filter((_, j) => j !== oIndex)
                    };
                }
                return item;
            });
        });
    }

    const handleOpenVariantModal = (index: number) => {
        currentVariantIndexRef.current = index;
        setVariantModalOpen(true);
    }

    const handleSelectVariants = (variant: { name: string, options: { id: string, title: string; }[] }) => {
        const vIndex = currentVariantIndexRef.current;
        setVariants(prev => prev.map((item, i) => {
            if (i === vIndex) {
                if (!item.name) {
                    item.name = variant.name;
                }
                const optionTitles = item.options.map(opt => opt.title);
                variant.options.filter(opt => !optionTitles.includes(opt.title))
                    .map(opt => {
                        item.options.push({title: opt.title, id: new Date().getTime().toString()});
                    });
                return {...item};
            }
            return item;
        }));
        setVariantModalOpen(false);
    };

    const handleUpdateSku = (sku: SkuItem, field: keyof SkuItem, value: string) => {
        setSkuOverrides(prevState => ({
            ...prevState,
            [sku.properties]: {
                ...sku,
                [field]: value
            }
        }));
    }

    const handleFillSkus = (field: keyof SkuItem, value: string) => {
        if (value.trim() === '') {
            return false;
        }
        setSkuOverrides(prevState => {
            skuData.finalSkus.forEach(item => {
                prevState[item.properties] = {
                    ...item,
                    [field]: value
                };
            });
            return {...prevState};
        })
    }

    const handleSortEnd = (oldIndex: number, newIndex: number) => {
        setVariants(prevState => arrayMove(prevState, oldIndex, newIndex));
    };

    const handleOptionSortEnd = (vIndex: number, oldIndex: number, newIndex: number) => {
        variants[vIndex].options = arrayMove(variants[vIndex].options, oldIndex, newIndex);
        setVariants([...variants]);
    }

    const initalSkuObject = useMemo(() => {
        return value.skus.reduce((acc, cur) => {
            acc[cur.properties] = cur;
            return acc;
        }, {} as Record<string, SkuItem>);
    }, [value.skus]);

    const skuData = useMemo(() => {
        const rowCount: number[] = [];
        const attrNames: string[] = [];
        const groups: SkuOptionItem[][] = [];
        const finalVariants: VariantItem[] = [];
        variants.map((variant) => {
            if (variant.name) {
                const options: SkuOptionItem[] = [];
                variant.options.map(function (o) {
                    if (o.title) {
                        options.push({
                            value: o.title,
                            key: variant.name + ':' + o.title
                        });
                    }
                });

                if (options.length > 0) {
                    groups.push(options);
                    attrNames.push(variant.name);
                    rowCount.push(options.length);
                    finalVariants.push({
                        ...variant,
                        options: options.map(item => ({id: item.key, title: item.value}))
                    });
                }
            }
        });

        const rowSpans: number[] = [];
        const showCount: number[] = [];
        for (let i = 0; i < rowCount.length; i++) {
            const subRowCount = rowCount.slice(i + 1, rowCount.length);
            rowSpans.push(subRowCount.reduce(function (a, b) {
                return a * b;
            }, 1));

            const subAttrCount = rowCount.slice(0, i + 1);
            const rowspanItem = subAttrCount.reduce(function (a, b) {
                return a * b;
            }, 1);
            showCount.push(rowspanItem);
        }

        let finalSkus: SkuItem[] = [];
        let skuOptions: SkuOptionItem[][] = [];
        const overrideSkus: Record<string, SkuItem> = {
            ...initalSkuObject,
            ...skuOverrides
        };
        if (groups.length > 0) {
            skuOptions = groups.reduce((acc: SkuOptionItem[][], group: SkuOptionItem[]) => {
                return acc.flatMap(prev =>
                    group.map(curr => [...prev, curr])
                );
            }, [[]]);

            // 转化为后端需要的对象结构
            finalSkus = skuOptions.map((combination: SkuOptionItem[]) => {
                const name = combination.map(item => item.value).join(',');
                const properties = combination.map(item => item.key).join(';');
                const sku = {
                    id: 0,
                    name,
                    code: '',
                    price: 0,
                    stock: 0,
                    properties
                }
                if (overrideSkus[properties]) {
                    sku.id = overrideSkus[properties].id || 0;
                    sku.price = overrideSkus[properties].price;
                    sku.stock = overrideSkus[properties].stock;
                    sku.code = overrideSkus[properties].code;
                }

                return sku;
            });
        }

        return {
            attrNames,
            skuOptions,
            finalSkus,
            finalVariants,
            rowCount,
            rowSpans,
            showCount
        }
    }, [variants, initalSkuObject, skuOverrides]);

    useEffect(() => {
        onChange?.({
            variants: skuData.finalVariants,
            skus: skuData.finalSkus
        })
    }, [onChange, skuData]);

    return (
        <>
            <Card title="型号价格与库存">
                <SortableProvider key="variants" onSortEnd={handleSortEnd}>
                    {
                        variants.map((variant, vindex) => (
                            <SortableCard
                                key={`variant-${variant.name}-${vindex}`}
                                id={`variant-${vindex}`}
                                index={vindex}
                                title={
                                    <>
                                        <strong>型号分类:</strong>
                                        <Input
                                            placeholder="新建型号分类"
                                            className="w-40!"
                                            value={variant.name}
                                            onChange={e => handleUpdateVariant(vindex, e.target.value)}
                                            onClear={() => handleUpdateVariant(vindex, '')}
                                            allowClear={true}
                                        />
                                        <Button type={"link"} size={'small'}
                                                onClick={() => handleOpenVariantModal(vindex)}>选择常用型号</Button>
                                    </>
                                }
                                extra={<Button type="link"
                                               onClick={() => handleRemoveVariant(vindex)}>移除</Button>}
                            >
                                <SortableProvider
                                    key={`variant-${vindex}`}
                                    onSortEnd={(oldIndex, newIndex) => handleOptionSortEnd(vindex, oldIndex, newIndex)}
                                >
                                    <div style={{
                                        padding: 0,
                                        marginBottom: 16,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 10
                                    }}>
                                        {
                                            variant.options.map((option, idx) => (
                                                <SortableOption key={`option-${vindex}-${idx}-${option.title}`}
                                                                id={`option-${vindex}-${idx}}`} index={idx}>
                                                    <Tag
                                                        onClose={(e) => {
                                                            e.preventDefault();
                                                            handleRemoveOption(vindex, idx);
                                                        }}
                                                        onClick={() => handleEditOption(vindex, idx)}
                                                        closable={true}
                                                        style={{
                                                            paddingTop: 5,
                                                            paddingBottom: 5,
                                                            paddingLeft: 10,
                                                            paddingRight: 10,
                                                            cursor: 'pointer'
                                                        }}
                                                    >{option.title}</Tag>
                                                </SortableOption>
                                            ))
                                        }
                                    </div>
                                </SortableProvider>
                                <div>
                                    <Button type="dashed" size={'middle'} icon={<PlusOutlined/>}
                                            onClick={() => handleAddOption(vindex)}>
                                        添加型号
                                    </Button>
                                </div>
                            </SortableCard>
                        ))
                    }
                </SortableProvider>

                {
                    variants.length < 3 && (
                        <Button icon={<PlusOutlined/>} onClick={handleAddVariant}>
                            添加型号分类
                        </Button>
                    )
                }
                {
                    skuData.finalSkus.length > 0 && (
                        <div className="sku-table-container">
                            <table className={`sku-table`}>
                                <thead>
                                <tr>
                                    {
                                        skuData.attrNames.map((name, idx) => (
                                            <th key={`variant-name-${idx}`}>{name}</th>
                                        ))
                                    }
                                    <th style={{width: 100}}>
                                        <div>价格<label style={{color: 'red'}}>*</label></div>
                                        <Input
                                            style={{width: 100, fontWeight: 400}}
                                            onBlur={e => handleFillSkus('price', e.target.value)}
                                        />
                                    </th>
                                    <th style={{width: 100}}>
                                        <div>库存<label style={{color: 'red'}}>*</label></div>
                                        <Input
                                            style={{width: 100, fontWeight: 400}}
                                            onBlur={e => handleFillSkus('stock', e.target.value)}
                                        />
                                    </th>
                                    <th style={{width: 100}}>
                                        <div>商家编码</div>
                                        <Input
                                            style={{width: 100, fontWeight: 400}}
                                            onBlur={e => handleFillSkus('code', e.target.value)}
                                        />
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {
                                    skuData.finalSkus.map((sku, idx) => (
                                        <tr key={`sku-${idx}`}>
                                            {
                                                skuData.skuOptions[idx].map((option, j) => {
                                                    if (showColumn(skuData.showCount, idx, j)) {
                                                        return (<td rowSpan={skuData.rowSpans[j]}
                                                                    key={`sku-col-${idx}-${j}`}>{option.value}</td>)
                                                    }

                                                    return null;
                                                })
                                            }
                                            <td>
                                                <Input
                                                    value={sku.price}
                                                    style={{width: 100}}
                                                    onChange={e => handleUpdateSku(sku, 'price', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <Input
                                                    value={sku.stock}
                                                    style={{width: 100}}
                                                    onChange={e => handleUpdateSku(sku, 'stock', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <Input
                                                    value={sku.code}
                                                    style={{width: 100}}
                                                    onChange={e => handleUpdateSku(sku, 'code', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                }
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </Card>
            <ProductVariantModal
                open={variantModalOpen}
                onClose={() => setVariantModalOpen(false)}
                onSelect={handleSelectVariants}
            />
            <Modal
                title="添加型号"
                width={300}
                open={optionFormIsOpen}
                onOk={handleSaveOption}
                onCancel={() => setOptionFormIsOpen(false)}
            >
                <Input
                    placeholder="请输入型号名称"
                    value={optionTitle}
                    onChange={e => setOptionTitle(e.target.value)}
                />
            </Modal>
        </>
    );
};

export default ProductSkuInput;
