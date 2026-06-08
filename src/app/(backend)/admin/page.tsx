'use client';

import React, {useEffect, useState} from 'react';
import {Card, Col, Row, Statistic, Table, Progress, Flex, Avatar, Tag} from 'antd';
import {
    ShoppingCartOutlined,
    UserOutlined,
    DollarOutlined,
    RiseOutlined,
    ArrowUpOutlined,
    ShopOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import Link from "next/link";
import dayjs from "dayjs";
import {capitalize} from "@/lib/utils";
import {apiGet} from "@/lib/backendApi";
import {useAdministrator} from "@/contexts/BackendAppContext";
import {useTranslations} from '@/contexts/BackendLocaleContext';

const {Column} = Table;

const CreatedViaMap: Record<string, string> = {
    'app': 'App',
    'web': 'WEB',
    'pos': 'POS',
    'ai': 'AI'
}

const statusColorMap: Record<string, string> = {
    'processing': 'processing',
    'completed': 'success',
    'pending': 'warning',
    'cancelled': 'error',
};


export default function AdminDashboard() {
    const administrator = useAdministrator();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('dashboard');
    const {t: ta} = useTranslations('admin');
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [statData, setStatData] = useState<any>({
        todayOrders: 0,
        todaySales: 0,
        todayVisitors: 0,
        conversionRate: 4.2,
        monthSales: 0,
        monthUsers: 0,
        activeUsers: 0,
    });
    const [soldAnalytics, setSoldAnalytics] = useState<{ name: string, percent: number }[]>([]);

    const fetchOrders = async () => {
        apiGet(`/orders`, {limit: 5}).then(res => {
            setOrders(res.data.items)
        });
    };

    const fetchProducts = async () => {
        apiGet(`/dashboard/products`, {limit: 5, order_by: 'sold', order_direction: 'desc'}).then(res => {
            setProducts(res.data.items)
        });
    }

    const fetchStats = async () => {
        apiGet(`/dashboard/stats`).then(res => {
            setStatData((prevState: any) => ({...prevState, ...res.data}));
        });
    }

    const fetchSoldAnalytics = () => {
        apiGet(`/dashboard/sold-analysis`).then(response => {
            const {total, items} = response.data;
            setSoldAnalytics(
                items.map((item: any) => ({
                    name: CreatedViaMap[item.name],
                    percent: (item.value / total * 100).toFixed(0)
                }))
            );
        });
    }

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        fetchStats();
        fetchSoldAnalytics();
    }, []);

    if (administrator?.role !== 'administrator') {
        return null;
    }

    return (
        <div>
            <h2 style={{marginBottom: 24, fontSize: 24, fontWeight: 'bold'}}>{ta('dashboard')}</h2>

            {/* Stats Cards */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                            <div>
                                <div style={{color: '#8c8c8c', fontSize: 14, marginBottom: 8}}>{t('todaySales')}</div>
                                <Statistic
                                    value={statData.todaySales}
                                    prefix={'€'}
                                    suffix={''}
                                    styles={{
                                        content: {
                                            fontSize: 28, fontWeight: 'bold'
                                        }
                                    }}
                                />
                            </div>
                            <DollarOutlined style={{fontSize: 32, color: '#ff4d4f'}}/>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                            <div>
                                <div style={{color: '#8c8c8c', fontSize: 14, marginBottom: 8}}>{t('todayOrders')}</div>
                                <Statistic
                                    value={statData.todayOrders}
                                    prefix={''}
                                    suffix={t('unitOrders')}
                                    styles={{
                                        content: {
                                            fontSize: 28, fontWeight: 'bold'
                                        }
                                    }}
                                />
                            </div>
                            <ShoppingCartOutlined style={{fontSize: 32, color: '#1890ff'}}/>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                            <div>
                                <div
                                    style={{color: '#8c8c8c', fontSize: 14, marginBottom: 8}}>{t('todayVisitors')}</div>
                                <Statistic
                                    value={statData.todayVisitors}
                                    prefix={''}
                                    suffix={t('unitPeople')}
                                    styles={{
                                        content: {
                                            fontSize: 28, fontWeight: 'bold'
                                        }
                                    }}
                                />
                            </div>
                            <UserOutlined style={{fontSize: 32, color: '#52c41a'}}/>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                            <div>
                                <div style={{
                                    color: '#8c8c8c',
                                    fontSize: 14,
                                    marginBottom: 8
                                }}>{t('conversionRate')}</div>
                                <Statistic
                                    value={4.2}
                                    prefix={''}
                                    suffix={'%'}
                                    styles={{
                                        content: {
                                            fontSize: 28, fontWeight: 'bold'
                                        }
                                    }}
                                />
                            </div>
                            <RiseOutlined style={{fontSize: 32, color: '#faad14'}}/>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Recent Orders & Top Products */}
            <Row gutter={[16, 16]} style={{marginTop: 16}}>
                <Col xs={24} lg={14}>
                    <Card title={t('recentOrders')} extra={<Link href="/admin/orders">{tc('more')}</Link>}>
                        <Table dataSource={orders} pagination={false} size="middle"
                               rowKey={(record) => record.order_no}>
                            <Column title={t('orderNo')} dataIndex="order_no" key="order_no"/>
                            <Column title={t('customer')} dataIndex="buyer_name" key="buyer_name"/>
                            <Column
                                title={t('amount')}
                                dataIndex="total"
                                key="total"
                                render={(total: number) => `€${total}`}
                            />
                            <Column
                                title={t('date')}
                                dataIndex="created_at"
                                key="created_at"
                                render={(date: string) => dayjs(date).format('MM-DD')}
                            />
                            <Column
                                title={t('status')}
                                dataIndex="status"
                                key="status"
                                render={(status: string) => (
                                    <Tag color={statusColorMap[status] || 'default'}>{capitalize(status)}</Tag>
                                )}
                            />
                        </Table>
                    </Card>
                </Col>

                <Col xs={24} lg={10}>
                    <Card title={t('hotProducts')}>
                        <Flex vertical gap={12}>
                            {products.map((item, index) => (
                                <div key={item.id}
                                     style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                                        <Avatar
                                            size="small"
                                            style={{backgroundColor: index < 3 ? '#ff4d4f' : '#8c8c8c'}}
                                        >
                                            {index + 1}
                                        </Avatar>
                                        <div>
                                            <div style={{fontWeight: 500}}>{item.title}</div>
                                            <div style={{
                                                color: '#8c8c8c',
                                                fontSize: 12
                                            }}>{t('salesCount')} {item.sold.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div style={{fontWeight: 'bold', color: '#ff4d4f'}}>
                                        €{item.price.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </Flex>
                    </Card>
                </Col>
            </Row>

            {/* Category Distribution & Overview */}
            <Row gutter={[16, 16]} style={{marginTop: 16}}>
                <Col xs={24} lg={12}>
                    <Card title={t('categorySalesRatio')}>
                        {soldAnalytics.map((item, index) => (
                            <div key={index} style={{marginBottom: 16}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                                    <span>{item.name}</span>
                                    <span>{item.percent}%</span>
                                </div>
                                <Progress percent={item.percent} strokeColor="#ff4d4f" showInfo={false}/>
                            </div>
                        ))}
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card title={t('dataOverview')}>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Card style={{background: '#fff1f0', border: 'none'}}>
                                    <Statistic
                                        title={t('monthlySales')}
                                        value={statData.monthSales}
                                        prefix={<><ArrowUpOutlined style={{color: '#52c41a'}}/> €</>}
                                        styles={{content: {color: '#262626'}}}
                                    />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card style={{background: '#e6f7ff', border: 'none'}}>
                                    <Statistic
                                        title={t('monthlyNewUsers')}
                                        value={statData.monthUsers}
                                        prefix={<ArrowUpOutlined style={{color: '#52c41a'}}/>}
                                        styles={{content: {color: '#262626'}}}
                                    />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card style={{background: '#f6ffed', border: 'none'}}>
                                    <Statistic
                                        title={t('storeCount')}
                                        value={1}
                                        prefix={<ShopOutlined style={{color: '#52c41a'}}/>}
                                        styles={{content: {color: '#262626'}}}
                                    />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card style={{background: '#fffbe6', border: 'none'}}>
                                    <Statistic
                                        title={t('activeCustomers')}
                                        value={statData.activeUsers}
                                        prefix={<TeamOutlined style={{color: '#faad14'}}/>}
                                        styles={{content: {color: '#262626'}}}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
