'use client';

import React, {useEffect, useState} from 'react';
import {apiGet} from '@/lib/api';
import {useTranslations} from '@/contexts/LocaleContext';
import {ChevronRight} from 'lucide-react';

interface Category {
    id: number;
    name: string;
    slug: string;
    parent_id?: number;
    children?: Category[];
}

interface CategorySidebarProps {
    selected?: number;
    onSelect: (categoryId: number | undefined) => void;
}

export default function CategorySidebar({selected, onSelect}: CategorySidebarProps) {
    const {t} = useTranslations('ecommerce');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    useEffect(() => {
        apiGet('/categories', {taxonomy: 'product_category'})
            .then(data => {
                const items = Array.isArray(data) ? data : (data?.data || []);
                setCategories(items);
            })
            .catch(() => {
            })
            .finally(() => setLoading(false));
    }, []);

    const toggleExpand = (id: number) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    if (loading) {
        return <div className="space-y-2 p-2">{Array.from({length: 5}).map((_, i) => (
            <div key={i} className="animate-pulse h-8 bg-gray-100 rounded"/>
        ))}</div>;
    }

    const isSelected = (id: number | undefined) => {
        if (id === undefined) return selected === undefined;
        return selected === id;
    };

    return (
        <nav className="space-y-0.5">
            <button
                onClick={() => onSelect(undefined)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected(undefined) ? 'bg-primary text-primary-foreground font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
                {t('filter.allCategories')}
            </button>
            {categories.map(cat => (
                <div key={cat.id}>
                    <div className="flex items-center">
                        <button
                            onClick={() => {
                                onSelect(cat.id);
                                if (cat.children?.length) toggleExpand(cat.id);
                            }}
                            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                isSelected(cat.id) ? 'bg-primary text-primary-foreground font-medium' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {cat.name}
                        </button>
                        {cat.children?.length ? (
                            <button
                                onClick={() => toggleExpand(cat.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-600"
                            >
                                <ChevronRight
                                    size={14}
                                    className={`transition-transform ${expanded.has(cat.id) ? 'rotate-90' : ''}`}
                                />
                            </button>
                        ) : null}
                    </div>
                    {cat.children?.length && expanded.has(cat.id) ? (
                        <div className="ml-4 space-y-0.5">
                            {cat.children.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => onSelect(child.id)}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                        isSelected(child.id) ? 'bg-primary text-primary-foreground font-medium' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {child.name}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            ))}
        </nav>
    );
}
