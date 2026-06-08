'use client';

import {useState} from 'react';
import {Form, Input, Button, Card} from 'antd';
import {UserOutlined, LockOutlined} from '@ant-design/icons';
import {useMessage} from "@/contexts/BackendAppContext";
import {apiPost} from "@/lib/backendApi";
import Cookies from "js-cookie";

export default function AdminLoginClient() {
    const message = useMessage();
    const [loading, setLoading] = useState(false);

    const onFinish = (values: any) => {
        setLoading(true);
        // 登录逻辑
        apiPost(`/auth/login`, {
            account: values.account,
            password: values.password
        }).then(response => {
            const {access_token, user} = response.data;
            Cookies.set('adminToken', access_token);
            Cookies.set('adminUser', JSON.stringify(user));
            window.location.reload();
        }).catch(reason => {
            //console.log(reason);
            message.error(reason.message);
        }).finally(() => {
            setLoading(false);
        });
    };

    return (
        <div
            className="min-h-screen bg-linear-to-br  flex items-center justify-center relative overflow-hidden">
            {/* 动态背景粒子效果 */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-20 -left-20 animate-pulse"></div>
                <div
                    className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse"
                    style={{animationDelay: '1s'}}></div>
                <div
                    className="absolute w-64 h-64 bg-pink-500/10 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"
                    style={{animationDelay: '2s'}}></div>
            </div>

            {/* 登录卡片 */}
            <Card
                className="w-full max-w-md mx-4 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">后台管理系统</h1>
                    <p className="text-gray-400">请登录以继续</p>
                </div>

                <Form
                    name="login"
                    initialValues={{remember: true, account: '', password: ''}}
                    onFinish={onFinish}
                    autoComplete="off"
                    size="large"
                >
                    <Form.Item
                        name="account"
                        rules={[{required: true, message: '请输入用户名'}]}
                    >
                        <Input
                            prefix={<UserOutlined className="text-gray-400"/>}
                            placeholder="邮箱/手机号"
                            size={'large'}
                            className="bg-gray-800/50 border-gray-600 h-11! text-white placeholder-gray-500"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{required: true, message: '请输入密码'}]}
                        hasFeedback={true}
                    >
                        <Input.Password
                            prefix={<LockOutlined className="text-gray-400"/>}
                            placeholder="密码"
                            size={'large'}
                            className="bg-gray-800/50 border-gray-600 h-11! text-white placeholder-gray-500"
                        />
                    </Form.Item>

                    <Form.Item style={{marginTop: 16}}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            size={'large'}
                            className="w-full h-11! bg-linear-to-r from-purple-600 to-blue-600 border-none hover:from-purple-700 hover:to-blue-700"
                        >
                            登录
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
