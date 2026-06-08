'use client';

import {useRouter} from "next/navigation";
import {Button, Col, Form, Input, Row, Select} from "antd";
import RichTextEditor from "@/components/common/RichTextEditor";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {CategoryCheckboxGroup} from "@/components/backend/CategoryCheckboxGroup";
import FeaturedImageInput from "@/components/backend/FeaturedImageInput";

const {TextArea} = Input;

export interface PostFormProps {
    onSubmit?: (values: any) => Promise<void>;
    initialValues?: any;
    submitting?: boolean;
}

export const PostForm = ({
                             initialValues = {},
                             submitting = false,
                             onSubmit,
                         }: PostFormProps) => {
    const [form] = Form.useForm();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('posts');
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
                        label={t('title')}
                        name="title"
                        rules={[{required: true, message: t('titleRequired')}]}
                    >
                        <Input placeholder={t('titlePlaceholder')}/>
                    </Form.Item>

                    <Form.Item
                        label={t('slug')}
                        name="slug"
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
                        <RichTextEditor placeholder={t('contentPlaceholder')}/>
                    </Form.Item>
                </Col>

                {/* 右栏 */}
                <Col xs={24} lg={6}>
                    <Form.Item
                        label={t('cover')}
                        name="thumbnail"
                    >
                        <FeaturedImageInput/>
                    </Form.Item>

                    <Form.Item
                        label={t('category')}
                        name="categories"
                    >
                        <CategoryCheckboxGroup/>
                    </Form.Item>

                    <Form.Item
                        label={t('author')}
                        name="author"
                    >
                        <Input placeholder={t('authorPlaceholder')}/>
                    </Form.Item>

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
