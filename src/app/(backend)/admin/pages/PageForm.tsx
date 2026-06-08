'use client';

import {useState} from "react";
import {useRouter} from 'next/navigation';
import {Form, Input, Select, Button, Row, Col} from 'antd';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import RichTextEditor from '@/components/common/RichTextEditor';

const {TextArea} = Input;

export interface PageType {
    id?: number;
    title?: string;
    slug?: string;
    keywords?: string;
    description?: string;
    content?: string;
    status?: string;
    sort_num?: number
}

export interface PageFormProps {
    initialValues?: PageType;
    onSubmit?: (values: PageType) => void;
    submitting?: boolean;
}

export const PageForm = ({initialValues = {}, onSubmit, submitting = false}: PageFormProps) => {
    const [form] = Form.useForm();
    const router = useRouter();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('pages');
    const [content, setContent] = useState(initialValues.content);


    return (
        <Form
            form={form}
            layout="vertical"
            autoComplete="off"
            initialValues={initialValues}
            onFinish={onSubmit}
        >
            <Row gutter={24}>
                {/* 左栏 */}
                <Col xs={24} lg={18}>
                    <Form.Item
                        label={t('title')}
                        name="title"
                        rules={[{required: true, message: t('titleRequired')}]}
                    >
                        <Input placeholder={t('titlePlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        label={t('slug')}
                        name="slug"
                        rules={[{message: t('slugRequired')}]}
                    >
                        <Input placeholder={t('slugPlaceholder')}/>
                    </Form.Item>
                    <Form.Item
                        label={t('seoKeywords')}
                        name="keywords"
                    >
                        <Input placeholder={t('seoKeywordsPlaceholder')}/>
                    </Form.Item>
                    <Form.Item
                        label={t('excerpt')}
                        name="description"
                    >
                        <TextArea rows={3} placeholder={t('excerptPlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        label={t('content')}
                        name="content"
                        required
                    >
                        <RichTextEditor
                            value={content}
                            onChange={(value) => {
                                setContent(value);
                                form.setFieldValue('content', value);
                            }}
                        />
                    </Form.Item>
                </Col>

                {/* 右栏 */}
                <Col xs={24} lg={6}>
                    <Form.Item
                        label={t('status')}
                        name="status"
                        rules={[{required: true}]}
                    >
                        <Select
                            options={[
                                {value: 'draft', label: t('draft')},
                                {value: 'publish', label: t('publish')},
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
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                            {tc('save')}
                        </Button>
                        <Button
                            style={{marginLeft: 12}}
                            disabled={submitting}
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
