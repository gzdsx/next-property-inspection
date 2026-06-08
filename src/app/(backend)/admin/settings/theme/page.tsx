'use client';

import {useState, useEffect} from 'react';
import {
    App,
    Form,
    Input,
    Button,
    Card,
    Spin,
    Image,
} from 'antd';
import {SaveOutlined, FormatPainterOutlined} from '@ant-design/icons';
import {apiGet, apiPost} from "@/lib/backendApi";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {useMediaLibrary} from "@/contexts/BackendAppContext";

export default function ThemeSettingsPage() {
    const [form] = Form.useForm();
    const {message} = App.useApp();
    const mediaLibrary = useMediaLibrary();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string>('');
    const [homeLogoUrl, setHomeLogoUrl] = useState<string>('');
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('settings');

    useEffect(() => {
        fetchThemeConfig();
    }, []);

    const fetchThemeConfig = async () => {
        setLoading(true);
        try {
            const response = await apiGet('/settings');
            const data = response.data;

            form.setFieldsValue({
                logo: data.logo,
                home_page_logo: data.home_page_logo,
                home_page_banner_src: data.home_page_banner_src,
            });

            if (data.logo) {
                setLogoUrl(data.logo);
            }
            if (data.home_page_logo) {
                setHomeLogoUrl(data.home_page_logo);
            }
        } catch (error) {
            message.error(t('loadThemeConfigError'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            await apiPost('/settings', values);
            message.success(tc('saveSuccess'));
        } catch (error) {
            message.error(tc('saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleSelectLogo = () => {
        mediaLibrary.open({
            multiple: false,
            onSelect: (medias) => {
                const url = medias[0].src || medias[0].url || '';
                setLogoUrl(url);
                form.setFieldValue('logo', url);
            },
        });
    };

    const handleSelectHomeLogo = () => {
        mediaLibrary.open({
            multiple: false,
            onSelect: (medias) => {
                const url = medias[0].src || medias[0].url || '';
                setHomeLogoUrl(url);
                form.setFieldValue('home_page_logo', url);
            },
        });
    };

    const handleSelectBannerBg = () => {
        mediaLibrary.open({
            multiple: false,
            onSelect: (medias) => {
                const url = medias[0].src || medias[0].url || '';
                form.setFieldValue('home_page_banner_src', url);
            },
        });
    };

    return (
        <div>
            <Card title={
                <span>
                    <FormatPainterOutlined style={{marginRight: 8, color: '#ff4d4f'}}/>
                    {t('themeSettings')}
                </span>
            }>
                <Spin spinning={loading}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                    >
                        <Form.Item label={t('logo')} name="logo">
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: 12
                            }}>
                                {logoUrl && (
                                    <Image
                                        src={logoUrl}
                                        alt="logo"
                                        height={60}
                                        style={{objectFit: 'contain', borderRadius: 4}}
                                        preview={false}
                                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwAJhAPk2iUKYQAAAABJRU5ErkJggg=="
                                    />
                                )}
                                <Button onClick={handleSelectLogo}>{t('logoPlaceholder')}</Button>
                            </div>
                        </Form.Item>

                        <Form.Item label={t('homeLogo')} name="home_logo">
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: 12
                            }}>
                                {homeLogoUrl && (
                                    <Image
                                        src={homeLogoUrl}
                                        alt="home-logo"
                                        height={60}
                                        style={{objectFit: 'contain', borderRadius: 4}}
                                        preview={false}
                                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwAJhAPk2iUKYQAAAABJRU5ErkJggg=="
                                    />
                                )}
                                <Button onClick={handleSelectHomeLogo}>{t('homeLogoPlaceholder')}</Button>
                            </div>
                        </Form.Item>

                        <Form.Item label={t('homeBannerBackground')} name="home_page_banner_src">
                            <Input.Search
                                placeholder={t('homeBannerBackgroundPlaceholder')}
                                enterButton={t('selectImage')}
                                onSearch={handleSelectBannerBg}
                                style={{maxWidth: 500}}
                            />
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
