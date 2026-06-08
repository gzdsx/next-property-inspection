'use client';

import React from 'react';
import {Slider} from '@/components/ui/slider';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {useTranslations} from '@/contexts/LocaleContext';

interface PriceFilterProps {
    min?: number;
    max?: number;
    onChange: (range: [number, number]) => void;
}

export default function PriceFilter({min = 0, max = 10000, onChange}: PriceFilterProps) {
    const {t} = useTranslations('ecommerce');
    const [range, setRange] = React.useState<[number, number]>([min, max]);

    const handleApply = () => {
        onChange(range);
    };

    const handleReset = () => {
        setRange([0, 10000]);
        onChange([0, 10000]);
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">{t('filter.priceRange')}</h4>
            <Slider
                min={0}
                max={10000}
                step={10}
                value={range}
                onValueChange={(val) => setRange(val as [number, number])}
            />
            <div className="flex items-center gap-2">
                <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                    <Input
                        type="number"
                        min={0}
                        max={10000}
                        value={range[0]}
                        onChange={e => setRange([parseInt(e.target.value) || 0, range[1]])}
                        className="h-8 pl-6 text-sm"
                    />
                </div>
                <span className="text-gray-400">-</span>
                <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                    <Input
                        type="number"
                        min={0}
                        max={10000}
                        value={range[1]}
                        onChange={e => setRange([range[0], parseInt(e.target.value) || 10000])}
                        className="h-8 pl-6 text-sm"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <Button size="sm" onClick={handleApply}>{t('filter.apply')}</Button>
                <Button size="sm" variant="outline" onClick={handleReset}>{t('filter.reset')}</Button>
            </div>
        </div>
    );
}
