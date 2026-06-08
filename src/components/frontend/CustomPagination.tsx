'use client';

import React from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {useRouter, usePathname, useSearchParams} from 'next/navigation';

export default function CustomPagination({total, current, pageSize}: {
    total: number;
    current: number,
    pageSize: number
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const totalPages = Math.ceil(total / pageSize);

    const goToPage = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    if (totalPages <= 1) return null;

    const getPages = () => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current > 3) pages.push('ellipsis');
            const start = Math.max(2, current - 1);
            const end = Math.min(totalPages - 1, current + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (current < totalPages - 2) pages.push('ellipsis');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="py-6 flex justify-center">
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => current > 1 && goToPage(current - 1)}
                            className={current <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                    </PaginationItem>
                    {getPages().map((page, idx) => (
                        <PaginationItem key={idx}>
                            {page === 'ellipsis' ? (
                                <PaginationEllipsis/>
                            ) : (
                                <PaginationLink
                                    onClick={() => goToPage(page)}
                                    isActive={page === current}
                                    className="cursor-pointer"
                                >
                                    {page}
                                </PaginationLink>
                            )}
                        </PaginationItem>
                    ))}
                    <PaginationItem>
                        <PaginationNext
                            onClick={() => current < totalPages && goToPage(current + 1)}
                            className={current >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}
