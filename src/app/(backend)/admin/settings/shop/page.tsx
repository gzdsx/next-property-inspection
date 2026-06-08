'use client';

import {useState, useEffect} from 'react';
import {
    App,
    Form,
    Input,
    Switch,
    Button,
    Card,
    Row,
    Col,
    Spin,
    Select,
    TimePicker,
    DatePicker,
    Image,
} from 'antd';
import {SaveOutlined, ShopOutlined} from '@ant-design/icons';
import dayjs from 'dayjs';
import {apiGet, apiPost} from "@/lib/backendApi";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {useMediaLibrary} from "@/contexts/BackendAppContext";

export default function ShopSettingsPage() {
    const [form] = Form.useForm();
    const {message} = App.useApp();
    const mediaLibrary = useMediaLibrary();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [popupImageUrl, setPopupImageUrl] = useState<string>('');
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('settings');

    useEffect(() => {
        fetchShopConfig();
    }, []);

    const fetchShopConfig = async () => {
        setLoading(true);
        try {
            const response = await apiGet('/settings');
            const data = response.data;

            form.setFieldsValue({
                opening_hours_start: data.opening_hours_start ? dayjs(data.opening_hours_start, 'HH:mm') : undefined,
                opening_hours_end: data.opening_hours_end ? dayjs(data.opening_hours_end, 'HH:mm') : undefined,
                send_order_message: data.send_order_message,
                order_message_content: data.order_message_content,
                auto_print_order: data.auto_print_order,
                enable_points_checkout: data.enable_points_checkout,
                points_exchange_rate: data.points_exchange_rate,
                referral_points: data.referral_points,
                referral_link_description: data.referral_link_description,
                shop_order_warning: data.shop_order_warning,
                delivery_hours_start: data.delivery_hours_start ? dayjs(data.delivery_hours_start, 'HH:mm') : undefined,
                delivery_hours_end: data.delivery_hours_end ? dayjs(data.delivery_hours_end, 'HH:mm') : undefined,
                display_chinese_name: data.display_chinese_name,
                float_image: data.float_image,
                float_display_time_start: data.float_display_time_start ? dayjs(data.float_display_time_start) : undefined,
                float_display_time_end: data.float_display_time_end ? dayjs(data.float_display_time_end) : undefined,
                stop_order: data.stop_order,
                stop_order_message: data.stop_order_message,
                stop_order_time_start: data.stop_order_time_start ? dayjs(data.stop_order_time_start) : undefined,
                stop_order_time_end: data.stop_order_time_end ? dayjs(data.stop_order_time_end) : undefined,
                printer_type: data.printer_type,
                printnode_api_key: data.printnode_api_key,
                printnode_printer_id: data.printnode_printer_id,
                till_password: data.till_password,
                discount_password: data.discount_password,
                holiday_pay_rate: data.holiday_pay_rate,
                casher_report_password: data.casher_report_password
            });

            if (data.float_image) {
                setPopupImageUrl(data.float_image);
            }
        } catch (error) {
            message.error(t('loadShopConfigError'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            const payload = {...values};
            // Convert dayjs objects to strings
            if (payload.opening_hours_start) {
                payload.opening_hours_start = (payload.opening_hours_start as dayjs.Dayjs).format('HH:mm');
            }
            if (payload.opening_hours_end) {
                payload.opening_hours_end = (payload.opening_hours_end as dayjs.Dayjs).format('HH:mm');
            }
            if (payload.delivery_hours_start) {
                payload.delivery_hours_start = (payload.delivery_hours_start as dayjs.Dayjs).format('HH:mm');
            }
            if (payload.delivery_hours_end) {
                payload.delivery_hours_end = (payload.delivery_hours_end as dayjs.Dayjs).format('HH:mm');
            }
            if (payload.float_display_time_start) {
                payload.float_display_time_start = (payload.float_display_time_start as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss');
            }
            if (payload.float_display_time_end) {
                payload.float_display_time_end = (payload.float_display_time_end as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss');
            }
            if (payload.stop_order_time_start) {
                payload.stop_order_time_start = (payload.stop_order_time_start as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss')
            }
            if (payload.stop_order_time_end) {
                payload.stop_order_time_end = (payload.stop_order_time_end as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss')
            }
            await apiPost('/settings', payload);
            message.success(tc('saveSuccess'));
        } catch (error: unknown) {
            message.error(tc('saveError'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <Card title={
                <span>
                    <ShopOutlined style={{marginRight: 8, color: '#ff4d4f'}}/>
                    {t('shopSettings')}
                </span>
            }>
                <Spin spinning={loading}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                    >
                        {/* Business Hours */}
                        <Card
                            type="inner"
                            title={t('businessHours')}
                            style={{marginBottom: 16}}
                        >
                            <Row gutter={16}>
                                <Col>
                                    <Form.Item label={t('businessHoursStart')} name="opening_hours_start">
                                        <TimePicker format="HH:mm" style={{width: 300}}/>
                                    </Form.Item>
                                </Col>
                                <Col>
                                    <Form.Item label={t('businessHoursEnd')} name="opening_hours_end">
                                        <TimePicker format="HH:mm" style={{width: 300}}/>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Order Settings */}
                        <Card
                            type="inner"
                            title={t('orderSettings')}
                            style={{marginBottom: 16}}
                        >
                            <Form.Item
                                label={t('sendOrderSms')}
                                name="send_order_message"
                                valuePropName="checked"
                                getValueProps={(value) => ({checked: value === 'yes'})}
                                getValueFromEvent={(checked) => (checked ? 'yes' : 'no')}
                                tooltip={{title: t('sendOrderSmsDesc')}}
                            >
                                <Switch/>
                            </Form.Item>
                            <Form.Item label={t('orderSmsContent')} name="order_message_content">
                                <Input.TextArea rows={3} placeholder={t('orderSmsContentPlaceholder')}/>
                            </Form.Item>
                            <Form.Item
                                label={t('autoPrintOrder')}
                                name="auto_print_order"
                                valuePropName="checked"
                                getValueProps={(value) => ({checked: value === 'yes'})}
                                getValueFromEvent={(checked) => (checked ? 'yes' : 'no')}
                                tooltip={{title: t('autoPrintOrderDesc')}}
                            >
                                <Switch/>
                            </Form.Item>
                            <Form.Item label={t('orderWarningMessage')} name="shop_order_warning">
                                <Input.TextArea rows={3} placeholder={t('orderWarningMessagePlaceholder')}/>
                            </Form.Item>
                        </Card>

                        {/* Points Settings */}
                        <Card
                            type="inner"
                            title={t('pointsSettings')}
                            style={{marginBottom: 16}}
                        >
                            <Form.Item
                                label={t('allowPointsPayment')}
                                name="enable_points_checkout"
                                valuePropName="checked"
                                getValueProps={(value) => ({checked: value === 'yes'})}
                                getValueFromEvent={(checked) => (checked ? 'yes' : 'no')}
                                tooltip={{title: t('allowPointsPaymentDesc')}}
                            >
                                <Switch/>
                            </Form.Item>
                            <Form.Item label={t('pointsExchangeRate')} name="points_exchange_rate">
                                <Input placeholder={t('pointsExchangeRatePlaceholder')} className="w-60!"/>
                            </Form.Item>
                        </Card>

                        {/* Share Settings */}
                        <Card
                            type="inner"
                            title={t('shareSettings')}
                            style={{marginBottom: 16}}
                        >
                            <Form.Item label={t('shareLinkPoints')} name="referral_points">
                                <Input placeholder={t('shareLinkPointsPlaceholder')} className="w-60!"/>
                            </Form.Item>
                            <Form.Item label={t('shareLinkDescription')} name="referral_link_description">
                                <Input.TextArea rows={3} placeholder={t('shareLinkDescriptionPlaceholder')}/>
                            </Form.Item>
                        </Card>

                        {/* Delivery Settings */}
                        <Card
                            type="inner"
                            title={t('deliverySettings')}
                            style={{marginBottom: 16}}
                        >
                            <Row gutter={16}>
                                <Col>
                                    <Form.Item label={t('deliveryTimeStart')} name="delivery_hours_start">
                                        <TimePicker format="HH:mm" style={{width: 300}}/>
                                    </Form.Item>
                                </Col>
                                <Col>
                                    <Form.Item label={t('deliveryTimeEnd')} name="delivery_hours_end">
                                        <TimePicker format="HH:mm" style={{width: 300}}/>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Menu Settings */}
                        <Card
                            type="inner"
                            title={t('menuSettings')}
                            style={{marginBottom: 16}}
                        >
                            <Form.Item
                                label={t('showChineseMenu')}
                                name="display_chinese_name"
                                valuePropName="checked"
                                getValueProps={(value) => ({checked: value === 'yes'})}
                                getValueFromEvent={(checked) => (checked ? 'yes' : 'no')}
                                help={t('showChineseMenuDesc')}
                            >
                                <Switch/>
                            </Form.Item>
                        </Card>

                        {/* Popup Settings */}
                        <Card
                            type="inner"
                            title={t('popupSettings')}
                            style={{marginBottom: 16}}
                        >
                            <Form.Item label={t('popupImage')} name="float_image">
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 12
                                }}>
                                    {popupImageUrl && (
                                        <Image
                                            src={popupImageUrl}
                                            alt="popup"
                                            width={80}
                                            height={80}
                                            style={{objectFit: 'cover', borderRadius: 4}}
                                            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwAJhAPk2iUKYQAAAABJRU5ErkJggg=="
                                        />
                                    )}
                                    <Button onClick={() => {
                                        mediaLibrary.open({
                                            multiple: false,
                                            onSelect: (medias) => {
                                                setPopupImageUrl(medias[0].src as string);
                                                form.setFieldsValue({
                                                    float_image: medias[0].src,
                                                });
                                            },
                                        });
                                    }}>{t('popupImagePlaceholder')}</Button>
                                </div>
                            </Form.Item>
                            <Row gutter={16}>
                                <Col>
                                    <Form.Item label={t('popupDisplayTimeStart')} name="float_display_time_start">
                                        <DatePicker showTime style={{width: 300}}/>
                                    </Form.Item>
                                </Col>
                                <Col>
                                    <Form.Item label={t('popupDisplayTimeEnd')} name="float_display_time_end">
                                        <DatePicker showTime style={{width: 300}}/>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item
                                label={t('stopOrdering')}
                                name="stop_order"
                                valuePropName="checked"
                                getValueProps={(value) => ({checked: value === 'yes'})}
                                getValueFromEvent={(checked) => (checked ? 'yes' : 'no')}
                                help={t('stopOrderingDesc')}
                            >
                                <Switch/>
                            </Form.Item>
                            <Row gutter={16}>
                                <Col>
                                    <Form.Item label={t('popupDisplayTimeStart')} name="stop_order_time_start">
                                        <DatePicker showTime style={{width: 300}}/>
                                    </Form.Item>
                                </Col>
                                <Col>
                                    <Form.Item label={t('popupDisplayTimeEnd')} name="stop_order_time_end">
                                        <DatePicker showTime style={{width: 300}}/>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item label={t('stopOrderingMessage')} name="stop_order_message">
                                <Input.TextArea rows={3} placeholder={t('stopOrderingMessagePlaceholder')}/>
                            </Form.Item>
                        </Card>

                        {/* Printer Settings */}
                        <Card
                            type="inner"
                            title={t('printerSettings')}
                            style={{marginBottom: 16}}
                        >
                            <Form.Item label={t('printerType')} name="printer_type">
                                <Select
                                    style={{width: 400}}
                                    placeholder={t('printerTypePlaceholder')}
                                    options={[
                                        {value: 'printnode', label: 'PrintNode'},
                                        {value: 'websocket', label: 'Local Printer'}
                                    ]}
                                    allowClear
                                />
                            </Form.Item>
                            <Form.Item label={t('printNodeApiKey')} name="printnode_api_key">
                                <Input placeholder={t('printNodeApiKeyPlaceholder')} style={{width: 400}}/>
                            </Form.Item>
                            <Form.Item label={t('printNodePrinterName')} name="printnode_printer_id">
                                <Input placeholder={t('printNodePrinterNamePlaceholder')} style={{width: 400}}/>
                            </Form.Item>
                        </Card>

                        {/* Other Settings */}
                        <Card
                            type="inner"
                            title={t('otherSettings')}
                            style={{marginBottom: 16}}
                        >
                            <Form.Item label={t('tillPassword')} name="till_password">
                                <Input.Password placeholder={t('tillPasswordPlaceholder')} className="w-60!"/>
                            </Form.Item>
                            <Form.Item label={t('discountAuthPassword')} name="discount_password">
                                <Input.Password placeholder={t('discountAuthPasswordPlaceholder')} className="w-60!"/>
                            </Form.Item>
                            <Form.Item label={t('CashierReportPassword')} name="casher_report_password">
                                <Input.Password className="w-60!"/>
                            </Form.Item>
                            <Form.Item label={t('holidayWageMultiplier')} name="holiday_pay_rate">
                                <Input placeholder={t('holidayWageMultiplierPlaceholder')} className="w-60!"/>
                            </Form.Item>
                        </Card>

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
