"use client";

import React, { useState } from "react";
import {
    Table,
    Card,
    Button,
    Space,
    Tag,
    Input,
    Select,
    Avatar,
    App,
    Popconfirm,
    Row,
    Col,
    Statistic,
} from "antd";
import {
    SearchOutlined,
    DeleteOutlined,
    CheckOutlined,
    FlagOutlined,
    UserOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {useTranslations} from "@/contexts/BackendLocaleContext";

const { Search } = Input;
const { Option } = Select;

interface CommentType {
    key: string;
    id: number;
    user: string;
    movie: string;
    content: string;
    time: string;
    status: string;
    likes: number;
}

const initialComments: CommentType[] = [
    {
        key: "1",
        id: 1,
        user: "moviefan001",
        movie: "阿凡达：水之道",
        content: "这部电影真的太棒了！特效和剧情都很出色，强烈推荐！",
        time: "2024-01-20 14:30",
        status: "正常",
        likes: 128,
    },
    {
        key: "2",
        id: 2,
        user: "filmcritic",
        movie: "流浪地球2",
        content: "导演的叙事能力很强，每个镜头都很有深意。但是节奏稍微有点慢。",
        time: "2024-01-20 12:15",
        status: "正常",
        likes: 85,
    },
    {
        key: "3",
        id: 3,
        user: "john_doe",
        movie: "沙丘2",
        content: "画质超赞，值得在电影院观看！",
        time: "2024-01-20 10:45",
        status: "正常",
        likes: 45,
    },
    {
        key: "4",
        id: 4,
        user: "spammer123",
        movie: "繁花",
        content: "加微信 xxx 免费观看所有电影...",
        time: "2024-01-19 23:30",
        status: "已标记",
        likes: 0,
    },
    {
        key: "5",
        id: 5,
        user: "jane_smith",
        movie: "庆余年2",
        content: "剧情跌宕起伏，演员演技在线，追剧停不下来！",
        time: "2024-01-19 20:20",
        status: "正常",
        likes: 67,
    },
    {
        key: "6",
        id: 6,
        user: "baduser",
        movie: "鬼灭之刃",
        content: "垃圾动漫，浪费时间",
        time: "2024-01-19 18:00",
        status: "已屏蔽",
        likes: 5,
    },
    {
        key: "7",
        id: 7,
        user: "cinema_lover",
        movie: "奥本海默",
        content: "诺兰又一次证明了他是当代最伟大的导演之一。",
        time: "2024-01-19 15:10",
        status: "正常",
        likes: 92,
    },
    {
        key: "8",
        id: 8,
        user: "moviebuff",
        movie: "蓝色星球2",
        content: "自然纪录片的巅峰之作，画面震撼人心。",
        time: "2024-01-19 12:30",
        status: "正常",
        likes: 156,
    },
];

export default function CommentsManagement() {
    const [comments, setComments] = useState<CommentType[]>(initialComments);
    const [searchText, setSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("全部");

    const {message} = App.useApp();
    const {t: tc} = useTranslations('common');
    const {t} = useTranslations('comments');

    const filteredComments = comments.filter((comment) => {
        const matchesSearch =
            comment.content.toLowerCase().includes(searchText.toLowerCase()) ||
            comment.user.toLowerCase().includes(searchText.toLowerCase()) ||
            comment.movie.toLowerCase().includes(searchText.toLowerCase());
        const matchesStatus =
            filterStatus === t('all') || comment.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleApprove = (id: number) => {
        setComments(
            comments.map((comment) =>
                comment.id === id ? { ...comment, status: t('normal') } : comment,
            ),
        );
        message.success(t('approvedSuccess'));
    };

    const handleFlag = (id: number) => {
        setComments(
            comments.map((comment) =>
                comment.id === id ? { ...comment, status: t('flagged') } : comment,
            ),
        );
        message.success(t('flaggedSuccess'));
    };

    const handleDelete = (id: number) => {
        setComments(comments.filter((comment) => comment.id !== id));
        message.success(tc('deleteSuccess'));
    };

    const handleBlock = (id: number) => {
        setComments(
            comments.map((comment) =>
                comment.id === id ? { ...comment, status: t('blocked') } : comment,
            ),
        );
        message.success(t('blockedSuccess'));
    };

    const columns: ColumnsType<CommentType> = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: 80,
        },
        {
            title: t('user'),
            dataIndex: "user",
            key: "user",
            width: 150,
            render: (user: string) => (
                <Space>
                    <Avatar
                        style={{ backgroundColor: "#ff4d4f" }}
                        icon={<UserOutlined />}
                    />
                    <span>{user}</span>
                </Space>
            ),
        },
        {
            title: t('movie'),
            dataIndex: "movie",
            key: "movie",
            width: 150,
        },
        {
            title: t('content'),
            dataIndex: "content",
            key: "content",
            width: 300,
            ellipsis: true,
        },
        {
            title: t('commentTime'),
            dataIndex: "time",
            key: "time",
            width: 150,
        },
        {
            title: t('likes'),
            dataIndex: "likes",
            key: "likes",
            width: 100,
            render: (likes: number) => likes || 0,
        },
        {
            title: t('status'),
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status: string) => {
                const color =
                    status === t('normal')
                        ? "success"
                        : status === t('flagged')
                          ? "warning"
                          : "error";
                return <Tag color={color}>{status}</Tag>;
            },
        },
        {
            title: tc('actions'),
            key: "action",
            width: 200,
            render: (_, record) => (
                <Space size="small">
                    {record.status !== t('normal') && (
                        <Button
                            type="link"
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={() => handleApprove(record.id)}
                        >
                            {t('approve')}
                        </Button>
                    )}
                    {record.status === t('normal') && (
                        <Button
                            type="link"
                            size="small"
                            icon={<FlagOutlined />}
                            onClick={() => handleFlag(record.id)}
                        >
                            {t('flag')}
                        </Button>
                    )}
                    <Popconfirm
                        title={t('blockConfirm')}
                        onConfirm={() => handleBlock(record.id)}
                        okText={tc('confirm')}
                        cancelText={tc('cancel')}
                    >
                        <Button type="link" size="small" danger>
                            {t('block')}
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        title={tc('deleteConfirm')}
                        onConfirm={() => handleDelete(record.id)}
                        okText={tc('confirm')}
                        cancelText={tc('cancel')}
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            {tc('delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: "bold" }}>
                {t('commentManagement')}
            </h2>

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title={t('totalComments')}
                            value={12345}
                            styles={{ content: { color: "#262626" } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title={t('normalComments')}
                            value={11890}
                            styles={{ content: { color: "#52c41a" } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title={t('pendingReview')}
                            value={234}
                            styles={{ content: { color: "#faad14" } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title={t('blockedComments')}
                            value={221}
                            styles={{ content: { color: "#ff4d4f" } }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <div
                    style={{
                        marginBottom: 16,
                        display: "flex",
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <Search
                        placeholder={t('searchPlaceholder')}
                        allowClear
                        style={{ width: 300 }}
                        onSearch={setSearchText}
                        prefix={<SearchOutlined />}
                    />
                    <Select
                        defaultValue={t('all')}
                        style={{ width: 120 }}
                        onChange={setFilterStatus}
                    >
                        <Option value={t('all')}>{t('allStatus')}</Option>
                        <Option value={t('normal')}>{t('normal')}</Option>
                        <Option value={t('flagged')}>{t('flagged')}</Option>
                        <Option value={t('blocked')}>{t('blocked')}</Option>
                    </Select>
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredComments}
                    pagination={{
                        total: filteredComments.length,
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => tc('totalRecords', {total: String(total)}),
                    }}
                />
            </Card>
        </div>
    );
}
