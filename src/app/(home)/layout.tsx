import type {Metadata} from "next";
import {auth} from "@/auth";
import {LocaleProvider} from "@/contexts/LocaleContext";
import LoginClient from "@/components/frontend/LoginClient";
import "./globals.css";
import {RootLayoutClient} from "@/app/(home)/RootLayoutClient";
import {AppProvider} from "@/contexts/AppContext";
import {Toaster} from "@/components/ui/sonner"
import {SessionProvider} from "next-auth/react";

export const metadata: Metadata = {
    title: "Video Portal Demo",
    description: "Interactive Inspection Video Portal",
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();
    return (
        <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
        <LocaleProvider>
            {
                session ? (
                    <SessionProvider session={session}>
                        <AppProvider>
                            <RootLayoutClient>{children}</RootLayoutClient>
                        </AppProvider>
                    </SessionProvider>
                ) : <LoginClient/>
            }
            <Toaster position={'top-center'}/>
        </LocaleProvider>
        </body>
        </html>
    );
}
