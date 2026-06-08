'use client';

import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {useTranslations} from '@/contexts/LocaleContext';

interface SkuItem {
    name: string;
    price: number;
    stock: number;
    properties: string;
}

interface VariantType {
    name: string;
    options: { title: string; price?: number }[];
}

interface VariantOption {
    title: string;
    price?: number;
}

interface VariantSelectorProps {
    variants: VariantType[];
    skus: SkuItem[];
    onSkuChange: (sku: SkuItem | null) => void;
}

export default function VariantSelector({variants, skus, onSkuChange}: VariantSelectorProps) {
    const {t} = useTranslations('ecommerce');
    const [selected, setSelected] = useState<Record<string, string>>({});

    const handleSelect = (variant: VariantType, option: VariantOption) => {
        setSelected(prev => {
            const next = {...prev};
            if (next[variant.name] === option.title) {
                delete next[variant.name];
            } else {
                next[variant.name] = option.title;
            }
            return next;
        });
    };

    const skuObjects = skus.reduce((acc, cur) => {
        acc[cur.properties] = cur;
        return acc;
    }, {} as Record<string, SkuItem>);

    React.useEffect(() => {
        const skuVariants: string[] = [];
        variants.forEach(variant => {
            if (selected[variant.name]) {
                skuVariants.push(variant.name + ':' + selected[variant.name]);
            }
        });
        const skuProperties = skuVariants.join(';');
        if (skuObjects[skuProperties]) {
            onSkuChange?.(skuObjects[skuProperties]);
        }else {
            onSkuChange?.(null);
        }
    }, [onSkuChange, selected, skuObjects, variants]);

    if (variants.length === 0) return null;

    return (
        <div className="space-y-4">
            {variants.map?.((variant, index) => (
                <div key={`attr-${index}`}>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                        {variant.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {variant.options.map((option, idx) => {
                            const isActive = selected[variant.name] === option.title;
                            return (
                                <Button
                                    key={`option-${index}-${idx}`}
                                    variant={isActive ? 'default' : 'outline'}
                                    size="sm"
                                    className={isActive ? '' : 'hover:border-gray-400 hover:text-gray-700'}
                                    onClick={() => handleSelect(variant, option)}
                                >
                                    {option.title}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
