import {auth} from "@/auth";
import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

import {LanguageProvider} from "@/contexts/LanguageContext";
import {LocaleProvider} from "@/contexts/LocaleContext";
import LoginClient from "@/components/frontend/LoginClient";
import {SessionProvider} from "next-auth/react";
import {ReportProvider} from "@/contexts/ReportContext";
import {QueryProvider} from "@/contexts/QueryProvider";

export const metadata: Metadata = {
    title: "AI Property Inspection",
    description: "AI-powered property inspection system",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Inspection AI",
    },
};

export const viewport = {
    themeColor: "#2563eb",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export const dynamic = 'force-dynamic';
export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            suppressHydrationWarning
        >
        <head>
        </head>
        <body className="antialiased" suppressHydrationWarning>
        <LocaleProvider>
            <LanguageProvider>
                <SessionProvider session={session}>
                    {
                        session ? (
                            <QueryProvider>
                                <ReportProvider>{children}</ReportProvider>
                            </QueryProvider>
                        ) : <LoginClient/>
                    }
                </SessionProvider>
            </LanguageProvider>
        </LocaleProvider>
        </body>
        </html>
    );
}
