'use client';

import {useState, useEffect} from 'react';
import {App, Form, Input, InputNumber, Select, Button, Card, Spin} from 'antd';
import {SaveOutlined} from '@ant-design/icons';
import {apiGet, apiPost} from "@/lib/backendApi";
import {useTranslations} from "@/contexts/BackendLocaleContext";


interface MailConfig {
    mail_form_name: string;
    mail_form_address: string;
    mail_host: string;
    mail_port: number;
    mail_encryption: 'none' | 'ssl' | 'tls';
    mail_username: string;
    mail_password: string;
}

export default function MailSettingsPage() {
    const [form] = Form.useForm<MailConfig>();
    const {message} = App.useApp();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('settings');

    useEffect(() => {
        fetchMailConfig();
    }, []);

    const fetchMailConfig = async () => {
        setLoading(true);
        try {
            const response = await apiGet('/settings');
            const {mail_form_name, mail_form_address, mail_host, mail_port, mail_encryption, mail_username, mail_password} = response.data;
            form.setFieldsValue({
                mail_form_name,
                mail_form_address,
                mail_host,
                mail_port,
                mail_encryption,
                mail_username,
                mail_password
            });
        } catch (error) {
            message.error(t('loadMailConfigError'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: MailConfig) => {
        setSaving(true);
        try {
            await apiPost(`/settings`,{
                mail_form_name: values.mail_form_name,
                mail_form_address: values.mail_form_address,
                mail_host: values.mail_host,
                mail_port: values.mail_port,
                mail_encryption: values.mail_encryption,
                mail_username: values.mail_username,
                mail_password: values.mail_password
            });
            message.success(tc('saveSuccess'));
        } catch (error) {
            message.error(tc('saveError'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <Card title={t('smtpConfig')}>
                <Spin spinning={loading}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{
                            mail_encryption: 'none',
                            mail_port: 25,
                        }}
                    >
                        <Form.Item
                            label={t('senderName')}
                            name="mail_form_name"
                            rules={[{required: true, message: t('senderNameRequired')}]}
                        >
                            <Input placeholder={t('senderNamePlaceholder')} className={'w-80!'}/>
                        </Form.Item>

                        <Form.Item
                            label={t('senderEmail')}
                            name="mail_form_address"
                            rules={[
                                {required: true, message: t('senderEmailRequired')},
                                {type: 'email', message: t('senderEmailInvalid')},
                            ]}
                        >
                            <Input placeholder="example@domain.com" className={'w-120!'}/>
                        </Form.Item>

                        <Form.Item
                            label={t('smtpHost')}
                            name="mail_host"
                            rules={[{required: true, message: t('smtpHostRequired')}]}
                        >
                            <Input placeholder="smtp.example.com" className={'w-80!'}/>
                        </Form.Item>

                        <Form.Item
                            label={t('smtpPort')}
                            name="mail_port"
                            rules={[{required: true, message: t('smtpPortRequired')}]}
                        >
                            <InputNumber min={1} max={65535} style={{width: '100%'}} placeholder="25" className={'w-80!'}/>
                        </Form.Item>

                        <Form.Item
                            label={t('encryption')}
                            name="mail_encryption"
                            rules={[{required: true, message: t('encryptionRequired')}]}
                        >
                            <Select className={'w-80!'}
                                options={[
                                    {value: 'none', label: t('none')},
                                    {value: 'ssl', label: 'SSL'},
                                    {value: 'tls', label: 'TLS'},
                                ]}
                            />
                        </Form.Item>

                        <Form.Item
                            label={t('smtpUsername')}
                            name="mail_username"
                            rules={[{required: true, message: t('smtpUsernameRequired')}]}
                        >
                            <Input placeholder={t('smtpUsernamePlaceholder')} className={'w-80!'}/>
                        </Form.Item>

                        <Form.Item
                            label={t('smtpPassword')}
                            name="mail_password"
                            rules={[{required: true, message: t('smtpPasswordRequired')}]}
                        >
                            <Input.Password placeholder={t('smtpPasswordPlaceholder')} className={'w-80!'}/>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" icon={<SaveOutlined/>} loading={saving}>
                                {tc('save')}
                            </Button>
                        </Form.Item>
                    </Form>
                </Spin>
            </Card>
        </div>
    );
}
