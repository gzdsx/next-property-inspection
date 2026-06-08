import {ConfigProvider, App} from "antd";
import {Metadata} from "next";
import {cookies} from "next/headers";
import {AntdRegistry} from "@ant-design/nextjs-registry";
import {BackendLocaleProvider} from "@/contexts/BackendLocaleContext";
import AdminRootLayout from "./admin/AdminRootLayout";
import AdminLoginClient from "@/components/backend/AdminLoginClient";
import './globals.css';

export const metadata: Metadata = {
    title: "后台管理中心",
    keywords: "大师兄微小店",
    description: "大师兄微小店",
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
}

export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {
    const tokenStorage = await cookies();
    const accessToken = tokenStorage.get('adminToken')?.value;

    return (
        <html lang="en" className="w-full overflow-x-hidden relative">
        <body className={`min-h-screen w-full overflow-x-hidden relative overscroll-x-none`}>
        <BackendLocaleProvider>
            <ConfigProvider theme={{
                components: {
                    Button: {
                        iconGap: 4
                    }
                },
                token: {
                    colorPrimary: '#55b5a5',
                    colorLink: '#55b5a5',
                }
            }}>
                <AntdRegistry>
                    <App>
                        {
                            accessToken ? (
                                <AdminRootLayout>{children}</AdminRootLayout>
                            ) : (
                                <AdminLoginClient/>
                            )
                        }
                    </App>
                </AntdRegistry>
            </ConfigProvider>
        </BackendLocaleProvider>
        </body>
        </html>
    );
}
