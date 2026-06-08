'use client';

import React from 'react';
import { Card, Row, Col, Statistic, Progress, List, Avatar } from 'antd';
import {
  ArrowUpOutlined,
  EyeOutlined,
  UserOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import {useTranslations} from '@/contexts/BackendLocaleContext';

export default function AnalyticsPage() {
    const {t} = useTranslations('analytics');

    const weeklyData = [
      { day: t('monday'), views: 12500, users: 450 },
      { day: t('tuesday'), views: 13200, users: 480 },
      { day: t('wednesday'), views: 14800, users: 520 },
      { day: t('thursday'), views: 13900, users: 490 },
      { day: t('friday'), views: 15600, users: 560 },
      { day: t('saturday'), views: 18200, users: 680 },
      { day: t('sunday'), views: 19500, users: 720 },
    ];

    const monthlyData = [
      { month: t('month8'), views: 320000, growth: '+12%' },
      { month: t('month9'), views: 380000, growth: '+18%' },
      { month: t('month10'), views: 420000, growth: '+10%' },
      { month: t('month11'), views: 480000, growth: '+14%' },
      { month: t('month12'), views: 520000, growth: '+8%' },
      { month: t('month1'), views: 580000, growth: '+11%' },
    ];

    const topCategories = [
      { name: t('movie'), views: 234567, percentage: 45 },
      { name: t('tv'), views: 123456, percentage: 23 },
      { name: t('variety'), views: 89012, percentage: 17 },
      { name: t('anime'), views: 67890, percentage: 13 },
      { name: t('documentary'), views: 23456, percentage: 2 },
    ];

    const userGrowth = [
      { date: t('thisWeek'), newUsers: 890, active: 7845, growth: '+15%' },
      { date: t('thisMonth'), newUsers: 3456, active: 32456, growth: '+23%' },
      { date: t('thisQuarter'), newUsers: 9876, active: 85490, growth: '+31%' },
    ];

  const maxViews = Math.max(...weeklyData.map(d => d.views));

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 'bold' }}>{t('analyticsTitle')}</h2>

      {/* Overview Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('totalPlays')}
              value={1.2}
              suffix="M"
              prefix={<EyeOutlined style={{ color: '#ff4d4f' }} />}
              styles={{ content: { color: '#262626' } }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#52c41a', fontSize: 14 }}>
                <ArrowUpOutlined /> 18%
              </span>
              <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 8 }}>{t('vsLastMonth')}</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('registeredUsers')}
              value={8549}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#262626' } }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#52c41a', fontSize: 14 }}>
                <ArrowUpOutlined /> 23%
              </span>
              <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 8 }}>{t('vsLastMonth')}</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('todayPlays')}
              value={45.6}
              suffix="K"
              prefix={<PlayCircleOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#262626' } }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#52c41a', fontSize: 14 }}>
                <ArrowUpOutlined /> 12%
              </span>
              <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 8 }}>{t('vsYesterday')}</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('avgWatchTime')}
              value={12.5}
              suffix={t('minutes')}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#262626' } }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#52c41a', fontSize: 14 }}>
                <ArrowUpOutlined /> 8%
              </span>
              <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 8 }}>{t('vsLastWeek')}</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Weekly Views Chart */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title={t('weeklyPlayTrend')}>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 250, gap: 16 }}>
              {weeklyData.map((data, index) => {
                const height = (data.views / maxViews) * 100;
                return (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%',
                      height: `${height}%`,
                      backgroundColor: '#ff4d4f',
                      borderRadius: '4px 4px 0 0',
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: -24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: 12,
                        color: '#8c8c8c',
                      }}>
                        {(data.views / 1000).toFixed(1)}K
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>{data.day}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={t('monthlyGrowthTrend')}>
            <List
              itemLayout="horizontal"
              dataSource={monthlyData}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: '#f0f0f0', color: '#262626' }}>
                        {item.month}
                      </Avatar>
                    }
                    title={`${(item.views / 1000).toFixed(0)}K ${t('plays')}`}
                    description={t('monthlyStats')}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowUpOutlined style={{ color: '#52c41a' }} />
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{item.growth}</span>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Category Distribution & User Growth */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={t('categoryPlayRatio')}>
            {topCategories.map((category, index) => (
              <div key={index} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{category.name}</span>
                  <span style={{ color: '#8c8c8c' }}>{category.percentage}%</span>
                </div>
                <Progress
                  percent={category.percentage}
                  strokeColor="#ff4d4f"
                  showInfo={false}
                  size="small"
                />
              </div>
            ))}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={t('userGrowthStats')}>
            <List
              grid={{ gutter: 16, column: 1 }}
              dataSource={userGrowth}
              renderItem={(item) => (
                <List.Item>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic title={t('timePeriod')} value={item.date} styles={{ content: { fontSize: 16 } }} />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title={t('newUsers')}
                          value={item.newUsers}
                          styles={{ content: { fontSize: 16, color: '#52c41a' } }}
                          prefix="+"
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title={t('activeUsers')}
                          value={item.active}
                          styles={{ content: { fontSize: 16 } }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Insights */}
      <Card
        style={{ marginTop: 16 }}
        title={
          <span>
            <LineChartOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
            {t('dataInsights')}
          </span>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card style={{ background: '#fff1f0', border: 'none' }}>
              <Statistic
                title={t('bestTimeSlot')}
                value={t('bestTimeSlotValue')}
                styles={{ content: { fontSize: 16, color: '#262626' } }}
              />
              <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>{t('highestUserActivity')}</div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ background: '#e6f7ff', border: 'none' }}>
              <Statistic
                title={t('hotCategory')}
                value={t('movie')}
                styles={{ content: { fontSize: 16, color: '#262626' } }}
              />
              <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>{t('categoryPercentage')}</div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ background: '#f6ffed', border: 'none' }}>
              <Statistic
                title={t('userRetention')}
                value={68}
                suffix="%"
                styles={{ content: { fontSize: 16, color: '#262626' } }}
              />
              <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>{t('sevenDayRetention')}</div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
