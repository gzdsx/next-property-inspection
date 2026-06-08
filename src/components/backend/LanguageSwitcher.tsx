'use client';

import { useLocale } from '@/contexts/BackendLocaleContext';
import { Select } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

export default function LanguageSwitcher() {
    const { locale, setLocale } = useLocale();

    return (
        <Select
            value={locale}
            onChange={(value) => setLocale(value as 'zh' | 'en')}
            style={{ width: 130 }}
            suffixIcon={<GlobalOutlined />}
            options={[
                { value: 'zh', label: '简体中文' },
                { value: 'en', label: 'English' },
            ]}
        />
    );
}
