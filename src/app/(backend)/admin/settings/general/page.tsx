'use client';

import React, {useEffect} from 'react';
import {
    Card,
    Form,
    Input,
    Switch,
    Button,
    Divider,
    Row,
    Col,
    App
} from 'antd';
import {
    GlobalOutlined,
    SafetyOutlined,
    DatabaseOutlined,
    BellOutlined,
    ReloadOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import {apiGet, apiPost} from "@/lib/backendApi";
import {useTranslations} from "@/contexts/BackendLocaleContext";

export default function SettingsPage() {
    const [form] = Form.useForm();
    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('settings');

    const handleSubmit = async (values: {
        sitename: string;
        keywords: string;
        description: string;
        admin_email: string;
        allow_registration: boolean;
        require_email_verification: boolean;
        allow_comments: boolean;
        require_comment_approval: boolean;
        max_upload_size: number;
        allowed_video_formats: string;
        notification_email: string;
        notification_interval: number;
    }) => {
        await apiPost(`/settings`, values);
        message.success(tc('saveSuccess'));
    };

    useEffect(() => {
        (async function () {
            const response = await apiGet(`/settings`);
            const {sitename, keywords, description, admin_email} = response.data;
            form.setFieldsValue({
                sitename,
                keywords,
                description,
                admin_email
            })
        })()
    }, [form]);

    return (
        <div>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                {/* Site Settings */}
                <Card
                    title={
                        <span>
                          <GlobalOutlined style={{marginRight: 8, color: '#ff4d4f'}}/>
                          {t('siteSettings')}
                        </span>
                    }
                    style={{marginBottom: 16}}
                >
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item label={t('siteName')} name="sitename">
                                <Input placeholder={t('siteNamePlaceholder')}/>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label={t('adminEmail')} name="admin_email">
                                <Input placeholder={t('adminEmailPlaceholder')}/>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item label={t('keywords')} name="keywords">
                        <Input placeholder={t('keywordsPlaceholder')}/>
                    </Form.Item>
                    <Form.Item label={t('siteDescription')} name="description">
                        <Input.TextArea rows={3} placeholder={t('siteDescriptionPlaceholder')}/>
                    </Form.Item>
                </Card>

                {/* User Settings */}
                <Card
                    title={
                        <span>
                          <SafetyOutlined style={{marginRight: 8, color: '#ff4d4f'}}/>
                          {t('userSettings')}
                        </span>
                    }
                    style={{marginBottom: 16}}
                >
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label={t('allowRegistration')}
                                name="allow_registration"
                                valuePropName="checked"
                                initialValue={true}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                    <Switch defaultChecked/>
                                    <span style={{color: '#8c8c8c', fontSize: 12}}>{t('allowRegistrationDesc')}</span>
                                </div>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label={t('emailVerification')}
                                name="require_email_verification"
                                valuePropName="checked"
                                initialValue={true}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                    <Switch defaultChecked/>
                                    <span style={{color: '#8c8c8c', fontSize: 12}}>{t('emailVerificationDesc')}</span>
                                </div>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider/>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label={t('allowComments')}
                                name="allow_comments"
                                valuePropName="checked"
                                initialValue={true}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                    <Switch defaultChecked/>
                                    <span style={{color: '#8c8c8c', fontSize: 12}}>{t('allowCommentsDesc')}</span>
                                </div>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label={t('commentReview')}
                                name="require_comment_approval"
                                valuePropName="checked"
                                initialValue={false}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                    <Switch/>
                                    <span
                                        style={{color: '#8c8c8c', fontSize: 12}}>{t('commentReviewDesc')}</span>
                                </div>
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Upload Settings */}
                <Card
                    title={
                        <span>
                          <DatabaseOutlined style={{marginRight: 8, color: '#ff4d4f'}}/>
                          {t('uploadSettings')}
                        </span>
                    }
                    style={{marginBottom: 16}}
                >
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label={t('maxUploadSizeLabel')}
                                name="max_upload_Size"
                                initialValue="500"
                            >
                                <Input type="number" placeholder={t('maxUploadSizePlaceholder')}/>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label={t('allowedFileTypes')}
                                name="allowed_file_formats"
                                initialValue="jpg, png, gif, mp4, pdf, doc, docx"
                            >
                                <Input placeholder={t('allowedFileTypesPlaceholder')}/>
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Notification Settings */}
                <Card
                    title={
                        <span>
                          <BellOutlined style={{marginRight: 8, color: '#ff4d4f'}}/>
                          {t('notificationSettings')}
                        </span>
                    }
                    style={{marginBottom: 16}}
                >
                    <Form.Item
                        label={t('systemNotifications')}
                        name="enable_notifications"
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                            <Switch defaultChecked/>
                            <span style={{color: '#8c8c8c', fontSize: 12}}>{t('systemNotificationsDesc')}</span>
                        </div>
                    </Form.Item>
                </Card>

                {/* Maintenance Mode */}
                <Card
                    title={
                        <span>
                          <ReloadOutlined style={{marginRight: 8, color: '#ff4d4f'}}/>
                          {t('maintenanceMode')}
                        </span>
                    }
                >
                    <Form.Item
                        label={t('enableMaintenance')}
                        name="maintenance_mode"
                        valuePropName="checked"
                        initialValue={false}
                    >
                        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                            <Switch/>
                            <span style={{color: '#8c8c8c', fontSize: 12}}>{t('enableMaintenanceDesc')}</span>
                        </div>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined/>}>
                            {tc('save')}
                        </Button>
                    </Form.Item>
                </Card>
            </Form>
        </div>
    );
}
