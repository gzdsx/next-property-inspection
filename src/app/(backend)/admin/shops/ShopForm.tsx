'use client';

import {useRouter} from "next/navigation";
import {Button, Col, Form, Input, InputNumber, Row, Select} from "antd";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import FeaturedImageInput from "@/components/backend/FeaturedImageInput";

const {TextArea} = Input;

export interface ShopFormProps {
    onSubmit?: (values: any) => Promise<void>;
    initialValues?: any;
    submitting?: boolean;
}

export const ShopForm = ({
                             initialValues = {},
                             submitting = false,
                             onSubmit,
                         }: ShopFormProps) => {
    const [form] = Form.useForm();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('shops');
    const router = useRouter();

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            autoComplete="off"
            initialValues={initialValues}
        >
            <Row gutter={24}>
                {/* 左栏 */}
                <Col xs={24} lg={18}>
                    <Form.Item
                        label={t('name')}
                        name="name"
                        rules={[{required: true, message: t('nameRequired')}]}
                    >
                        <Input placeholder={t('namePlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        label={t('address')}
                        name="address"
                        rules={[{required: true, message: t('addressRequired')}]}
                    >
                        <Input placeholder={t('addressPlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        label={t('phone')}
                        name="phone"
                        rules={[{required: true, message: t('phoneRequired')}]}
                    >
                        <Input placeholder={t('phonePlaceholder')}/>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label={t('longitude')}
                                name="longitude"
                            >
                                <InputNumber
                                    style={{width: '100%'}}
                                    placeholder={t('longitudePlaceholder')}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label={t('latitude')}
                                name="latitude"
                            >
                                <InputNumber
                                    style={{width: '100%'}}
                                    placeholder={t('latitudePlaceholder')}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label={t('businessHours')}
                        name="business_hours"
                    >
                        <Input placeholder={t('businessHoursPlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        label={t('manager')}
                        name="manager"
                    >
                        <Input placeholder={t('managerPlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        label={t('description')}
                        name="description"
                    >
                        <TextArea rows={3} placeholder={t('descriptionPlaceholder')}/>
                    </Form.Item>
                </Col>

                {/* 右栏 */}
                <Col xs={24} lg={6}>
                    <Form.Item
                        label={t('cover')}
                        name="cover"
                    >
                        <FeaturedImageInput/>
                    </Form.Item>

                    <Form.Item
                        label={t('status')}
                        name="status"
                        rules={[{required: true}]}
                    >
                        <Select
                            options={[
                                {value: 'open', label: t('open')},
                                {value: 'closed', label: t('closed')},
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
