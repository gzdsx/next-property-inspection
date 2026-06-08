'use client';

import React from 'react';
import {Form, Input, Row, Col, Button} from 'antd';
import {useRouter} from 'next/navigation';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import FeaturedImageInput from '@/components/backend/FeaturedImageInput';
import UserRoleSelect from './UserRoleSelect';
import UserStatusSelect from './UserStatusSelect';

export interface UserType {
    id?: number;
    name?: string;
    email?: string;
    iddcode?: string;
    phone_number?: string;
    avatar?: string;
    role_id?: number;
    status?: string;
}

export interface UserFormProps {
    onSubmit?: (values: UserType) => Promise<void>;
    initialValues?: UserType;
    submitting?: boolean;
}

const UserForm = ({
                      initialValues = {},
                      submitting = false,
                      onSubmit,
                  }: UserFormProps) => {
    const {t} = useTranslations('users');
    const router = useRouter();
    const [form] = Form.useForm();

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            autoComplete="off"
            initialValues={initialValues}
        >
            <Row gutter={24}>
                <Col xs={24} lg={18}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label={t('username')}
                                name="name"
                                rules={[{required: true, message: t('usernameRequired')}]}
                            >
                                <Input placeholder={t('usernamePlaceholder')}/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label={t('email')}
                                name="email"
                                rules={[
                                    {required: true, message: t('emailRequired')},
                                    {type: 'email', message: t('emailInvalid')},
                                ]}
                            >
                                <Input placeholder={t('emailPlaceholder')}/>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label={t('password')}
                                name="password"
                                rules={[{message: t('passwordRequired')}]}
                            >
                                <Input.Password placeholder={t('passwordPlaceholder')}/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label={t('phone')}
                                name="phone_number"
                            >
                                <Input placeholder={t('phonePlaceholder')}/>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label={t('role')}
                                name="role_id"
                                rules={[{required: true, message: t('roleRequired')}]}
                            >
                                <UserRoleSelect placeholder={t('selectRole')} style={{width: '100%'}}/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label={t('status')}
                                name="status"
                                rules={[{required: true}]}
                            >
                                <UserStatusSelect placeholder={t('selectStatus')} style={{width: '100%'}}/>
                            </Form.Item>
                        </Col>
                    </Row>
                </Col>

                <Col xs={24} lg={6}>
                    <Form.Item label={t('avatar')} name="avatar">
                        <FeaturedImageInput placeholder={t('selectAvatar')}/>
                    </Form.Item>
                </Col>
            </Row>

            <Row>
                <Col span={24}>
                    <Form.Item style={{marginTop: 24}}>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                            {t('save')}
                        </Button>
                        <Button style={{marginLeft: 12}} onClick={() => router.back()}>
                            {t('cancel')}
                        </Button>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default UserForm;
