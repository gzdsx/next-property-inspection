'use client';

import React, {createContext, useContext, useState, useEffect, ReactNode, useLayoutEffect} from 'react';
import {configureEcho} from "@laravel/echo-react";

export type Locale = 'zh' | 'en';

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const BackendLocaleContext = createContext<LocaleContextType | undefined>(undefined);

// 导入翻译文件
import zhMessages from '@/messages/backend/zh.json';
import enMessages from '@/messages/backend/en.json';

const messages: Record<Locale, any> = {
    zh: zhMessages,
    en: enMessages,
};

configureEcho({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    wsHost: 'pusher.noodlebox.ie',
    wssPort: 443,
    forceTLS: true,
    debugger: true,
    logToConsole: true, // 在控制台输出日志
    enabledTransports: ['ws', 'wss'],
    authEndpoint: 'https://dev.noodlebox.ie/broadcasting/auth',
});

export function BackendLocaleProvider({children}: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');

    useLayoutEffect(() => {
        // 从 localStorage 读取语言设置
        (function () {
            const savedLocale = localStorage.getItem('adminlocale') as Locale;
            if (savedLocale && (savedLocale === 'zh' || savedLocale === 'en')) {
                setLocaleState(savedLocale as Locale);
            } else {
                //检测浏览器语言
                const browserLang = navigator.language.toLowerCase();
                if (browserLang.startsWith('zh')) {
                    setLocaleState('zh');
                } else {
                    setLocaleState('en');
                }
            }
        })();
    }, []);

    useEffect(() => {

    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('adminlocale', newLocale);
        document.documentElement.lang = newLocale;
    };

    // 翻译函数 - 支持嵌套键名，如 'nav.home'
    const t = (key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let value: any = messages[locale];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        if (typeof value !== 'string') return key;
        if (!params) return value;
        return value.replace(/\{(\w+)\}/g, (_, name) =>
            params[name] !== undefined ? String(params[name]) : `{${name}}`
        );
    };

    return (
        <BackendLocaleContext.Provider value={{locale, setLocale, t}}>
            {children}
        </BackendLocaleContext.Provider>
    );
}

export function useLocale() {
    const context = useContext(BackendLocaleContext);
    if (!context) {
        throw new Error('useLocale must be used within a LocaleProvider');
    }
    return context;
}

// Hook for translations
export function useTranslations(namespace?: string) {
    const {t: baseT} = useLocale();

    const t = (key: string, params?: Record<string, string | number>): string => {
        const fullKey = namespace ? `${namespace}.${key}` : key;
        return baseT(fullKey, params);
    };

    return {t};
}
