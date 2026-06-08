'use client';

import {useState} from "react";
import {useRouter} from "next/navigation";
import {
    Button,
    Col,
    Form,
    Input,
    InputNumber,
    Radio,
    Row,
    Select
} from "antd";
import RichTextEditor from "@/components/common/RichTextEditor";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {CategoryCheckboxGroup} from "@/components/backend/CategoryCheckboxGroup";
import ImagesInput, {ImageItem} from "@/components/backend/ImagesInput";
import ProductSkuInput, {SkuItem, VariantItem} from "@/components/backend/ProductSkuInput";

const {TextArea} = Input;

export interface ProductType {
    id?: number;
    title?: string;
    skus: SkuItem[];
    has_sku_attr?: boolean;
    attr_list: VariantItem[];
    keywords?: string;
    description?: string;
    content?: string;
    thumbnail?: string;
    price?: number;
    regular_price?: number;
    status?: string;
    sort_num?: number;
    categories: number[];
    images: ImageItem[];
    icon?: string;
    sold?: number;
    stock?: number;
    points?: number;
}

export interface ProductFormProps {
    onSubmit?: (values: ProductType) => Promise<void>;
    initialValues?: ProductType;
    submitting?: boolean;
}

export const ProductForm = ({
                                initialValues = {
                                    skus: [],
                                    attr_list: [],
                                    categories: [],
                                    images: []
                                },
                                submitting = false,
                                onSubmit,
                            }: ProductFormProps) => {
    const [form] = Form.useForm();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('products');
    const router = useRouter();
    const [modelType, setModelType] = useState<'single' | 'multi'>(initialValues?.has_sku_attr ? 'multi' : 'single');
    const [skus, setSkus] = useState<SkuItem[]>(initialValues.skus || []);
    const [attrList, setAttrList] = useState<VariantItem[]>(initialValues.attr_list || []);


    // Intercept form submit to include skus & model_type
    const handleFinish = (values: ProductType) => {
        //console.log('values', values);
        const submitData = {
            ...values,
            has_sku_attr: modelType === 'multi',
            skus: skus,
            attr_list: attrList
        };
        onSubmit?.({...submitData});
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            autoComplete="off"
            initialValues={initialValues}
        >
            <Row gutter={24}>
                {/* 左栏 */}
                <Col xs={24} lg={18}>
                    <Form.Item
                        label={t('productImages')}
                        name="images"
                    >
                        <ImagesInput maxCount={5}/>
                    </Form.Item>

                    <Form.Item
                        label={t('title')}
                        name="title"
                        rules={[{required: true, message: t('titleRequired')}]}
                    >
                        <Input placeholder={t('titlePlaceholder')}/>
                    </Form.Item>

                    {/* 型号选择 */}
                    <Form.Item label={t('modelType')}>
                        <Radio.Group value={modelType} onChange={(e) => setModelType(e.target.value)}>
                            <Radio value="single">{t('singleModel')}</Radio>
                            <Radio value="multi">{t('multiModel')}</Radio>
                        </Radio.Group>
                    </Form.Item>

                    {/* 单一型号：显示价格、原价、库存 */}
                    {modelType === 'single' && (
                        <Row gutter={16} style={{marginBottom: 24}}>
                            <Col span={8}>
                                <Form.Item
                                    label={t('price')}
                                    name="price"
                                    rules={[{required: true, message: t('priceRequired')}]}
                                >
                                    <InputNumber
                                        min={0}
                                        precision={2}
                                        style={{width: '100%'}}
                                        placeholder={t('pricePlaceholder')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    label={t('originalPrice')}
                                    name="regular_price"
                                >
                                    <InputNumber
                                        min={0}
                                        precision={2}
                                        style={{width: '100%'}}
                                        placeholder={t('originalPricePlaceholder')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    label={t('stock')}
                                    name="stock"
                                >
                                    <InputNumber
                                        min={0}
                                        style={{width: '100%'}}
                                        placeholder={t('stockPlaceholder')}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    {/* 多级型号：规格变量选择 + SKU 列表 */}
                    {modelType === 'multi' && (
                        <ProductSkuInput
                            value={{
                                variants: initialValues.attr_list,
                                skus: initialValues.skus
                            }}
                            onChange={values => {
                                //console.log('values', values);
                                setSkus(values.skus);
                                setAttrList(values.variants);
                            }}
                        />
                    )}

                    <Form.Item
                        label={t('keywords')}
                        name="keywords"
                    >
                        <Input placeholder={t('keywordsPlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        label={t('description')}
                        name="description"
                    >
                        <TextArea rows={3} placeholder={t('descriptionPlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        label={t('content')}
                        name="content"
                    >
                        <RichTextEditor placeholder={t('contentPlaceholder')}/>
                    </Form.Item>
                </Col>

                {/* 右栏 */}
                <Col xs={24} lg={6}>
                    <Form.Item
                        label={t('category')}
                        name="categories"
                    >
                        <CategoryCheckboxGroup taxonomy="product"/>
                    </Form.Item>

                    <Form.Item
                        label={t('sales')}
                        name="sold"
                    >
                        <InputNumber min={0} style={{width: '100%'}} placeholder="0"/>
                    </Form.Item>

                    <Form.Item
                        label={t('points')}
                        name="points"
                    >
                        <InputNumber min={0} style={{width: '100%'}} placeholder="0"/>
                    </Form.Item>

                    <Form.Item
                        label={t('badge')}
                        name="icon"
                    >
                        <Select allowClear placeholder={t('badgePlaceholder')}
                                options={[
                                    {value: 'hot', label: t('hot')},
                                    {value: 'new', label: t('new')},
                                ]}
                        />
                    </Form.Item>

                    <Form.Item
                        label={t('status')}
                        name="status"
                        rules={[{required: true}]}
                    >
                        <Select
                            options={[
                                {value: 'active', label: t('active')},
                                {value: 'inactive', label: t('inactive')},
                                {value: 'soldout', label: t('soldout')},
                            ]}
                        />
                    </Form.Item>

                    <Form.Item
                        label={t('sortOrder')}
                        name="sort_num"
                    >
                        <Input type="number" placeholder="0"/>
                    </Form.Item>
                </Col>
            </Row>

            <Row>
                <Col span={24}>
                    <Form.Item style={{marginTop: 24}}>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                            {tc('save')}
                        </Button>
                        <Button
                            style={{marginLeft: 12}}
                            onClick={() => router.back()}
                        >
                            {tc('cancel')}
                        </Button>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};
