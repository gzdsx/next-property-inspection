'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Search} from 'lucide-react';
import {useTranslations} from '@/contexts/LocaleContext';

interface SearchBarProps {
    className?: string;
}

export default function SearchBar({className}: SearchBarProps) {
    const router = useRouter();
    const {t} = useTranslations('ecommerce');
    const [value, setValue] = useState('');

    const handleSearch = () => {
        const trimmed = value.trim();
        if (trimmed) {
            router.push(`/products?q=${encodeURIComponent(trimmed)}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className={`relative flex items-center ${className || ''}`}>
            <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none"/>
            <Input
                placeholder={t('header.searchPlaceholder')}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 pr-10 rounded-full h-9"
            />
            {value && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 h-7 w-7 p-0"
                    onClick={handleSearch}
                >
                    <Search size={14}/>
                </Button>
            )}
        </div>
    );
}
