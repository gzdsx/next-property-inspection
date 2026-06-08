import {type Order as OrderType} from "@/types";
import {Button, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Table, Tag, Timeline} from "antd";
import React, {useEffect, useMemo, useState} from "react";
import {useTranslations} from "@/contexts/BackendLocaleContext";
import {apiGet, apiPost, apiPut} from "@/lib/backendApi";
import {useMessage} from "@/contexts/BackendAppContext";

const ModalOrderProcessor = ({
                                 isOpen = false,
                                 order,
                                 onClose
                             }: {
    order: OrderType | null,
    isOpen: boolean,
    onClose: () => void
}) => {
    const messgae = useMessage();
    const {t} = useTranslations('orders');
    const [shippingMethod, setShippingMethod] = useState(order?.shipping_method || '');
    const [shippingZone, setShippingZone] = useState(order?.shipping_zone);
    const [shippingTotal, setShippingTotal] = useState(order?.shipping_total || '0');
    const [deliveryerId, setDeliveryerId] = useState(order?.deliveryer_id || 0);
    const [paymentMethod, setPaymentMethod] = useState(order?.payment_method || '');
    const [paymentType, setPaymentType] = useState(order?.payment_type || '');
    const [paymentFee, setPaymentFee] = useState(order?.payment_fee || '0');
    const [orderTotal, setOrderTotal] = useState(order?.total || '0');
    const [newOrderTotal, setNewOrderTotal] = useState('0');
    const [costTotal, setCostTotal] = useState('0');
    const [status, setStatus] = useState(order?.status || '');
    const [loading, setLoading] = useState(true);
    const [payByCashValue, setPayByCashValue] = useState('0');
    const [submitting, setSubmitting] = useState(false);

    const [paymentMethodList, setPaymentMethodList] = useState<any[]>([]);
    const [shippingZoneList, setShippingZoneList] = useState<any[]>([]);
    const [deliveryerList, setDeliveryerList] = useState<any[]>([]);
    const [noteList, setNoteList] = useState<any[]>([]);
    const [noteContent, setNoteContent] = useState('');
    const [noteSubmitting, setNoteSubmitting] = useState(false);

    const calculateTotal = async () => {
        if (paymentType === 'online') {
            let newCostTotal = Number(order?.cost_total || 0);
            let newShippingTotal = Number(shippingTotal);
            if (shippingMethod !== 'flat_rate') {
                newShippingTotal = 0;
            }

            const oldShippingTotal = Number(order?.shipping_total || 0);
            if (newShippingTotal !== oldShippingTotal) {
                newCostTotal += newShippingTotal - oldShippingTotal;
            }

            if (paymentFee !== order?.payment_fee) {
                newCostTotal += Number(paymentFee) - Number(order?.payment_fee || 0);
            }

            setCostTotal(newCostTotal.toFixed(2));
        } else {
            let newTotal = Number(order?.total || 0);
            let newShippingTotal = Number(shippingTotal);
            if (shippingMethod !== 'flat_rate') {
                newShippingTotal = 0;
            }

            const oldShippingTotal = Number(order?.shipping_total || 0);
            if (newShippingTotal !== oldShippingTotal) {
                newTotal += newShippingTotal - oldShippingTotal;
            }

            if (paymentFee !== order?.payment_fee) {
                newTotal += Number(paymentFee) - Number(order?.payment_fee || 0);
            }

            setOrderTotal(newTotal.toFixed(2));
        }
    }

    const handleSubmit = () => {
        setSubmitting(true);
        apiPut(`/orders/${order?.id}`, {
            shipping_method: shippingMethod,
            shipping_zone: shippingZone,
            shipping_total: shippingTotal,
            deliveryer_id: deliveryerId,
            payment_method: paymentMethod,
            payment_type: paymentType,
            payment_fee: paymentFee,
            total: orderTotal,
            cost_total: costTotal,
            status: status,
            metas: [
                {
                    key: 'payment_with_cash_value',
                    value: payByCashValue
                },
                {
                    key: 'payment_with_card_value',
                    value: payByCardValue
                }
            ]
        }).then(() => {
            messgae.success('Order Updated Successfully');
            onClose();
        }).catch(reason => {
            messgae.error(reason.message);
        }).finally(() => {
            setSubmitting(false);
        });
    }

    const handleAddContent = () => {
        if (noteContent.trim() === '') return;

        setNoteSubmitting(true);
        apiPost(`/orders/${order?.id}/notes`, {
            content: noteContent
        }).then(response => {
            const {content, created_at} = response.data;
            setNoteContent('');
            setNoteList(prevState => [{
                content: (
                    <div>
                        <div>{content}</div>
                        <div className={'text-gray-500'}>{created_at}</div>
                    </div>
                )
            }, ...prevState]);
        }).catch(reason => {
            messgae.error(reason.message);
        }).finally(() => {
            setNoteSubmitting(false);
        });
    }

    const renderItemOptions = (item: any) => {
        const options: string[] = [];
        try {

            if (Array.isArray(item.options)) {
                item.options.forEach((option: any) => {
                    options.push(option.value);
                });
            } else {
                Object.values(item.options).forEach((option: any) => {
                    options.push(option.toString());
                });
            }

            if (Array.isArray(item.additional_options)) {
                item.additional_options.forEach((addon: any) => {
                    options.push(addon.name);
                });
            }

            if (Array.isArray(item.comments)) {
                item.comments.forEach((comment: any) => {
                    options.push(`${comment.type}-${comment.name}`);
                });
            }
        } catch {

        }
        return options.join(',')
    }

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const payByCardValue = useMemo(() => {
        return (Number(orderTotal) - Number(payByCashValue)).toFixed(2);
    }, [orderTotal, payByCashValue]);

    const loadNotes = () => {
        apiGet(`/orders/${order?.id}/notes`).then((response) => {
            setNoteList(
                response.data.items.map((note: any) => ({
                    content: (
                        <div>
                            <div>{note.content}</div>
                            <div className={'text-gray-500'}>{note.created_at}</div>
                        </div>
                    )
                }))
            )
        });
    }

    useEffect(() => {
        loadNotes();
        Promise.all([
            apiGet('/options/payment-methods'),
            apiGet('/deliveryers?limit=100'),
            apiGet('/shipping-zones')
        ]).then((responses) => {
            setPaymentMethodList(Object.values(responses[0].data).map((m: any) => ({
                label: m.title,
                value: m.id,
                fee: m.fee,
                type: m.type,
                disabled: ['paypal', 'stripe', 'mix', 'stripe_terminal'].includes(m.id)
            })));
            setDeliveryerList((responses[1].data.items || []).map((d: any) => ({
                value: d.id,
                label: d.name,
                disabled: d.status === 'offline'
            })));
            setShippingZoneList((responses[2].data.items || []).map((z: any) => ({
                label: z.title + `(€${z.fee})`,
                value: z.title,
                fee: z.fee
            })));
        }).catch(reason => {
            console.log(reason);
        }).finally(() => {
            setLoading(false);
        });

        order?.metas?.forEach((meta: any) => {
            if (meta.key === 'payment_with_cash_value') {
                setPayByCashValue(meta.value);
            }
        });
    }, []);

    useEffect(() => {
        if (!loading) {
            setTimeout(calculateTotal);
        }
    }, [loading, shippingMethod, shippingTotal, paymentFee, paymentType, order]);


    if (!order || !isOpen) return null;
    return (
        <Modal title="订单处理" open={true} onCancel={onClose} width={1200} footer={null}>
            <Row>
                <Col span={12}>
                    <Descriptions
                        column={1}
                        style={{marginBottom: 16}}
                        styles={{
                            label: {width: 100, color: '#666'}
                        }}
                        items={[
                            {
                                key: 'orderNo',
                                label: t('orderNo'),
                                children: order.short_code
                            },
                            {
                                key: 'totalAmount',
                                label: t('totalAmount'),
                                children: `€` + Number(order.total).toFixed(2)
                            },
                            {
                                key: 'status',
                                label: '支付状态',
                                children: (
                                    <Tag color={order.is_paid ? 'success' : 'error'}>
                                        {order.is_paid ? '已支付' : '未支付'}
                                    </Tag>
                                )
                            },
                            {
                                key: 'paymentAt',
                                label: '付款时间',
                                children: order.payment_at
                            }
                        ]}
                    />
                    <Form labelCol={{span: 4}} labelAlign={'left'}>
                        <Form.Item label={'配送方式'} layout={'horizontal'}>
                            <Select
                                value={shippingMethod}
                                options={[
                                    {label: 'Delivery', value: 'flat_rate'},
                                    {label: 'Collection', value: 'local_pickup'},
                                    {label: 'Take Away', value: 'take_away'},
                                ]}
                                className={'w-60!'}
                                onChange={setShippingMethod}
                            />
                        </Form.Item>
                        {
                            shippingMethod === 'flat_rate' && (
                                <>
                                    <Form.Item label={'配送区域'} layout={'horizontal'}>
                                        <Select
                                            value={shippingZone}
                                            options={shippingZoneList}
                                            className={'w-60!'}
                                            onChange={(value, option) => {
                                                //console.log(option);
                                                setShippingZone(value);
                                                setShippingTotal(option.fee);
                                            }}
                                        />
                                    </Form.Item>
                                    <Form.Item label={'配送司机'} layout={'horizontal'}>
                                        <Select
                                            value={deliveryerId}
                                            options={deliveryerList}
                                            className={'w-60!'}
                                            onChange={setDeliveryerId}
                                        />
                                    </Form.Item>
                                </>
                            )
                        }
                        <Form.Item label={'订单状态'} layout={'horizontal'}>
                            <Select
                                value={status}
                                options={[
                                    {label: 'Pending', value: 'pending'},
                                    {label: 'Processing', value: 'processing'},
                                    {label: 'Delivering', value: 'delivering'},
                                    {label: 'Completed', value: 'completed'},
                                    {label: 'Cancelled', value: 'cancelled'},
                                    {label: 'Refunded', value: 'refunded'},
                                    {label: 'Failed', value: 'failed'},
                                ]}
                                className={'w-60!'}
                                onChange={setStatus}
                            />
                        </Form.Item>
                        <Form.Item label={'Order Total'} layout={'horizontal'}>
                            <Space.Compact className={'w-60!'}>
                                <Space.Addon>{orderTotal}</Space.Addon>
                                <Input
                                    defaultValue={newOrderTotal}
                                    onChange={(e) => {
                                        setNewOrderTotal(e.target.value);
                                    }}
                                />
                                <Button
                                    type={'default'}
                                    disabled={order.payment_type === 'online'}
                                    onClick={() => {
                                        setOrderTotal(newOrderTotal);
                                    }}
                                >Confirm</Button>
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={'Cost Total'} layout={'horizontal'}>
                            <Input
                                className={'w-60!'}
                                value={costTotal}
                                disabled={order.payment_type !== 'online'}
                                onChange={(e) => {
                                    setCostTotal(e.target.value);
                                }}
                            />
                        </Form.Item>
                        <Form.Item label={'付款方式'} layout={'horizontal'}>
                            <Select
                                value={paymentMethod}
                                options={paymentMethodList}
                                className={'w-60!'}
                                disabled={order.payment_type === 'online' || ['paypal', 'stripe', 'mix', 'stripe_terminal'].includes(order.payment_method || '')}
                                onChange={(value, option) => {
                                    setPaymentMethod(value);
                                    setPaymentFee(option.fee);
                                    setPaymentType(option.type);
                                }}
                            />
                        </Form.Item>
                        {
                            paymentType === 'mix' && (
                                <>
                                    <Form.Item label={'现金支付金额'} layout={'horizontal'}>
                                        <Input
                                            className={'w-60!'}
                                            defaultValue={payByCashValue}
                                            onChange={(e) => {
                                                const value = Number(e.target.value);
                                                if (value > Number(orderTotal)) {
                                                    setPayByCashValue(orderTotal);
                                                } else {
                                                    setPayByCashValue(e.target.value);
                                                }
                                            }}
                                        />
                                    </Form.Item>
                                    <Form.Item label={'卡支付金额'} layout={'horizontal'}>
                                        <Input
                                            className={'w-60!'}
                                            value={payByCardValue}
                                            disabled={true}
                                        />
                                    </Form.Item>
                                </>
                            )
                        }
                        <Row>
                            <Col span={4}/>
                            <Col>
                                <Button onClick={handleSubmit} type={'primary'} loading={submitting}>提交</Button>
                            </Col>
                        </Row>
                    </Form>
                </Col>
                <Col span={12}>
                    <h4 style={{marginBottom: 8, fontWeight: 'bold'}}>{t('orderItems')}</h4>
                    <Table
                        dataSource={order.items || []}
                        pagination={false}
                        rowKey={record => record.id}
                        size="small"
                        columns={[
                            {
                                title: t('productTitle'),
                                dataIndex: 'title',
                                key: 'title',
                                render: (_, record) => {
                                    return (
                                        <>
                                            <div className={'font-bold'}>{record.title}</div>
                                            <div className={'text-gray-500'}>{renderItemOptions(record)}</div>
                                        </>
                                    )
                                }
                            },
                            {
                                title: t('price'),
                                dataIndex: 'price',
                                key: 'price',
                                width: 100,
                                render: (price: number | string) => `€${Number(price).toFixed(2)}`,
                            },
                            {title: t('quantity'), dataIndex: 'quantity', key: 'quantity', width: 80},
                            {
                                title: t('subtotal'),
                                dataIndex: 'subtotal',
                                key: 'subtotal',
                                width: 100,
                                render: (subtotal: number | string) => `€${Number(subtotal).toFixed(2)}`,
                            }
                        ]}
                    />
                    <h4 style={{marginBottom: 8, marginTop: 8, fontWeight: 'bold'}}>Notes</h4>
                    <Timeline
                        items={noteList}
                    />
                    <Input.TextArea
                        rows={3}
                        value={noteContent}
                        onChange={(e) => {
                            setNoteContent(e.target.value);
                        }}
                    />
                    <Button
                        type={'primary'}
                        className={'mt-4'}
                        loading={noteSubmitting}
                        onClick={handleAddContent}
                        disabled={noteSubmitting || noteContent.trim() === ''}
                    >提交</Button>
                </Col>
            </Row>
        </Modal>
    );
};

export default ModalOrderProcessor;