import type {Metadata} from "next";
import {auth} from "@/auth";
import {LocaleProvider} from "@/contexts/LocaleContext";
import LoginClient from "@/components/frontend/LoginClient";
import "./globals.css";
import {RootLayoutClient} from "@/app/(home)/RootLayoutClient";
import {AppProvider} from "@/contexts/AppContext";

export const metadata: Metadata = {
    title: "Video Portal Demo",
    description: "Interactive Inspection Video Portal",
};

export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
        </head>
        <body suppressHydrationWarning>
        <LocaleProvider>
            <AppProvider>
                {
                    session ? <RootLayoutClient>{children}</RootLayoutClient> : <LoginClient/>
                }
            </AppProvider>
        </LocaleProvider>
        </body>
        </html>
    );
}
