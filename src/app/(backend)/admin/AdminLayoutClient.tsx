'use client';

import React, {useState} from 'react';
import {Layout, Menu, theme, Avatar, Dropdown, Button} from 'antd';
import {
    DashboardOutlined,
    UserOutlined,
    CommentOutlined,
    SettingOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    TeamOutlined,
    SafetyOutlined,
    FileTextOutlined,
    ToolOutlined, MailOutlined, ReadOutlined, FormOutlined, UnorderedListOutlined,
    ShoppingCartOutlined, ShoppingOutlined, AppstoreOutlined, EnvironmentOutlined, SwapOutlined,
    FolderOutlined, PictureOutlined, ShopOutlined, FormatPainterOutlined, SendOutlined,
    GiftOutlined, TrophyOutlined, FileSearchOutlined, ControlOutlined,
    SolutionOutlined, CalendarOutlined, DollarOutlined, FileProtectOutlined,
    CheckCircleOutlined, AccountBookOutlined, BarChartOutlined, ReconciliationOutlined,
    CarOutlined, DesktopOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useTranslations} from '@/contexts/BackendLocaleContext';
import LanguageSwitcher from '@/components/backend/LanguageSwitcher';
import {useAdministrator} from "@/contexts/BackendAppContext";
import {apiPost} from "@/lib/backendApi";
import Cookies from "js-cookie";

const {Header, Sider, Content} = Layout;

type MenuItem = {
    key: string;
    icon: React.ReactNode;
    label: React.ReactNode;
    roles: string[];
    children?: MenuItem[];
};

function filterMenus(menus: MenuItem[], role: string): MenuItem[] {
    return menus.filter(menu => {
        let hasPermission: boolean = false;
        if (role === 'administrator' || menu.roles.includes(role)) {
            hasPermission = true;
            if (menu.children) {
                menu.children = filterMenus(menu.children, role)
            }
        }

        return hasPermission;
    });
}

export default function AdminLayoutClient({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    const user = useAdministrator();
    const {t} = useTranslations('admin');
    const [collapsed, setCollapsed] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const {
        token: {colorBgContainer, borderRadiusLG},
    } = theme.useToken();
    const administrator = useAdministrator() || {role: 'user'};

    const menuItems: MenuItem[] = [
        {
            key: '/admin',
            icon: <DashboardOutlined/>,
            label: <Link href="/admin">{t('dashboard')}</Link>,
            roles: []
        },
        {
            key: 'shop',
            icon: <ShoppingCartOutlined/>,
            label: t('ecomManagement'),
            children: [
                {
                    key: '/admin/products',
                    icon: <ShoppingOutlined/>,
                    label: <Link href="/admin/products">{t('productManagement')}</Link>,
                    roles: ['manager']
                },
                {
                    key: '/admin/orders',
                    icon: <UnorderedListOutlined/>,
                    label: <Link href="/admin/orders">{t('orderManagement')}</Link>,
                    roles: ['manager']
                },
                {
                    key: '/admin/products/categories',
                    icon: <AppstoreOutlined/>,
                    label: <Link href="/admin/products/categories">{t('productCategoryManagement')}</Link>,
                    roles: []
                },
                {
                    key: '/admin/products/variants',
                    icon: <SwapOutlined/>,
                    label: <Link href="/admin/products/variants">{t('productVariantManagement')}</Link>,
                    roles: []
                },
                {
                    key: '/admin/shops',
                    icon: <EnvironmentOutlined/>,
                    label: <Link href="/admin/shops">{t('storeManagement')}</Link>,
                    roles: []
                }
            ],
            roles: ['manager']
        },
        {
            key: 'posts',
            icon: <ReadOutlined/>,
            label: t('postManagement'),
            children: [
                {
                    key: '/admin/posts',
                    icon: <UnorderedListOutlined/>,
                    label: <Link href="/admin/posts">{t('allPosts')}</Link>,
                    roles: []
                },
                {
                    key: '/admin/posts/create',
                    icon: <FormOutlined/>,
                    label: <Link href="/admin/posts/create">{t('addPost')}</Link>,
                    roles: []
                },
                {
                    key: '/admin/posts/categories',
                    icon: <AppstoreOutlined/>,
                    label: <Link href="/admin/posts/categories">{t('postCategoryManagement')}</Link>,
                    roles: []
                },
            ],
            roles: []
        },
        {
            key: 'pages',
            icon: <FileTextOutlined/>,
            label: t('pageManagement'),
            children: [
                {
                    key: '/admin/pages',
                    icon: <FileTextOutlined/>,
                    label: <Link href="/admin/pages">{t('allPages')}</Link>,
                    roles: []
                },
                {
                    key: '/admin/pages/create',
                    icon: <FileTextOutlined/>,
                    label: <Link href="/admin/pages/create">{t('addPage')}</Link>,
                    roles: []
                },
            ],
            roles: []
        },
        {
            key: 'user',
            icon: <TeamOutlined/>,
            label: t('userCenter'),
            children: [
                {
                    key: '/admin/users',
                    icon: <UserOutlined/>,
                    label: <Link href="/admin/users">{t('userManagement')}</Link>,
                    roles: ['manager']
                },
                {
                    key: '/admin/roles',
                    icon: <SafetyOutlined/>,
                    label: <Link href="/admin/roles">{t('roleManagement')}</Link>,
                    roles: ['manager']
                },
                // {
                //     key: '/admin/comments',
                //     icon: <CommentOutlined/>,
                //     label: <Link href="/admin/comments">{t('commentManagement')}</Link>,
                //     roles: []
                // },
            ],
            roles: []
        },
        {
            key: 'system',
            icon: <SettingOutlined/>,
            label: t('systemManagement'),
            children: [
                {
                    key: '/admin/settings/general',
                    icon: <ToolOutlined/>,
                    label: <Link href="/admin/settings/general">{t('systemSettings')}</Link>,
                    roles: []
                },
                {
                    key: '/admin/settings/mail',
                    icon: <MailOutlined/>,
                    label: <Link href="/admin/settings/mail">{t('mailSettings')}</Link>,
                    roles: []
                },
                {
                    key: '/admin/settings/shop',
                    icon: <ShopOutlined/>,
                    label: <Link href="/admin/settings/shop">{t('shopSettings')}</Link>,
                    roles: []
                },
                {
                    key: '/admin/settings/theme',
                    icon: <FormatPainterOutlined/>,
                    label: <Link href="/admin/settings/theme">{t('themeSettings')}</Link>,
                    roles: []
                }
            ],
            roles: []
        },
        {
            key: 'other',
            icon: <FolderOutlined/>,
            label: t('otherManagement'),
            children: [
                {
                    key: '/admin/materials',
                    icon: <AppstoreOutlined/>,
                    label: <Link href="/admin/materials">{t('materialManagement')}</Link>,
                    roles: []
                },
                {
                    key: '/admin/swipers',
                    icon: <PictureOutlined/>,
                    label: <Link href="/admin/swipers">{t('swiperManagement')}</Link>,
                    roles: []
                }
            ],
            roles: []
        },
    ];

    const userMenuItems = [
        {
            key: 'profile',
            label: t('profile'),
        },
        {
            key: 'settings',
            label: t('accountSettings'),
            onClick: () => {
                router.push('/admin/profile');
            }
        },
        {
            key: 'signout',
            label: t('logout'),
            onClick: () => logout()
        },
        {
            type: 'divider' as const,
        },
        {
            key: 'back',
            icon: <LogoutOutlined/>,
            label: <Link href="/">{t('backToFrontend')}</Link>,
        },
    ];

    const roleMenus = filterMenus(menuItems, administrator.role);

    const logout = async () => {
        try {
            await apiPost('/auth/logout');
        } catch (e) {
            console.error(e);
        } finally {
            await Cookies.remove('adminToken');
            await Cookies.remove('adminUser');
            window.location.reload();
        }
    }

    return (
        <Layout style={{minHeight: '100vh'}}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                style={{
                    background: colorBgContainer,
                    borderRight: '1px solid #f0f0f0',
                }}
            >
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #f0f0f0',
                }}>
                    <ShoppingOutlined style={{fontSize: 28, color: '#ff4d4f'}}/>
                    {!collapsed && (
                        <span style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            marginLeft: 8,
                            color: '#262626',
                        }}>Noodlebox</span>
                    )}
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[pathname]}
                    defaultOpenKeys={[pathname]}
                    style={{borderRight: 0}}
                    items={roleMenus}
                />
            </Sider>
            <Layout>
                <Header
                    style={{
                        padding: '0 24px 0 0',
                        background: colorBgContainer,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f0f0f0',
                    }}
                >
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            fontSize: '16px',
                            width: 64,
                            height: 64,
                        }}
                    />

                    <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                        <LanguageSwitcher/>
                        <Dropdown menu={{items: userMenuItems}} placement="bottomRight">
                            <div style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8}}>
                                <Avatar icon={<UserOutlined/>} src={user?.avatar}/>
                                <span style={{color: '#262626'}}>{user?.name}</span>
                            </div>
                        </Dropdown>
                    </div>
                </Header>
                <Content
                    style={{
                        margin: 16,
                        padding: 16,
                        minHeight: 280,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                    }}
                >
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
}
