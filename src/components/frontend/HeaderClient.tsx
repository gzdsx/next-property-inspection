'use client';

import React, {useState} from 'react';
import Link from 'next/link';
import {Badge} from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Sheet, SheetContent, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import {
    ShoppingCart,
    User,
    Menu,
    LogOut,
    Package,
    Settings,
} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useSession, signOut} from 'next-auth/react';
import {useCart} from '@/contexts/CartContext';
import {useTranslations, useLocale} from '@/contexts/LocaleContext';
import SearchBar from './SearchBar';
import Image from 'next/image';

export default function HeaderClient() {
    const {data: session} = useSession();
    const {totalItems} = useCart();
    const {t} = useTranslations('ecommerce');
    const {locale, setLocale} = useLocale();
    const router = useRouter();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const navLinks = [
        {href: '/', label: t('header.home')},
        {href: '/products', label: t('header.products')},
    ];

    return (
        <>
            {/* Desktop Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <img src="/logo.png" alt="Logo" style={{height: 50}}/>
                    </Link>

                    {/* Nav Links - Desktop */}
                    <nav className="hidden md:flex items-center gap-6">
                        {navLinks.map(link => (
                            <Link key={link.href} href={link.href}
                                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="hidden sm:block w-64">
                            <SearchBar/>
                        </div>

                        {/* Language Switch */}
                        <button
                            className="p-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
                        >
                            {locale === 'zh' ? 'EN' : '中文'}
                        </button>

                        {/* Cart */}
                        <Link href="/cart" className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
                            <ShoppingCart size={22}/>
                            {totalItems > 0 && (
                                <Badge
                                    className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center">
                                    {totalItems}
                                </Badge>
                            )}
                        </Link>

                        {/* User menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
                                    {session?.user?.image ? (
                                        <Image src={session.user.avatar as string} alt="avatar" width={28} height={28}
                                               className="rounded-full"/>
                                    ) : (
                                        <User size={22}/>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {session ? (
                                    <>
                                        <DropdownMenuItem onClick={() => router.push('/user/orders')}>
                                            <Package size={14} className="mr-2"/>
                                            {t('header.myOrders')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push('/user/profile')}>
                                            <Settings size={14} className="mr-2"/>
                                            {t('header.profile')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator/>
                                        <DropdownMenuItem
                                            onClick={() => signOut({redirectTo: window.location.pathname})}>
                                            <LogOut size={14} className="mr-2"/>
                                            {t('header.logout')}
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <>
                                        <DropdownMenuItem
                                            onClick={() => router.push('/login?callbackUrl=' + encodeURIComponent(window.location.pathname))}>
                                            <User size={14} className="mr-2"/>
                                            {t('header.login')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push('/register')}>
                                            <User size={14} className="mr-2"/>
                                            {t('header.register')}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Mobile Menu Button */}
                        <button className="md:hidden p-2 text-gray-600" onClick={() => setDrawerOpen(true)}>
                            <Menu size={22}/>
                        </button>
                    </div>
                </div>

                {/* Mobile Search */}
                <div className="sm:hidden px-4 pb-3">
                    <SearchBar/>
                </div>
            </header>

            {/* Mobile Drawer */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="left">
                    <SheetHeader>
                        <SheetTitle>{t('brandName')}</SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col gap-1 mt-4">
                        {navLinks.map(link => (
                            <Link key={link.href} href={link.href}
                                  className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                  onClick={() => setDrawerOpen(false)}>
                                {link.label}
                            </Link>
                        ))}
                        <button
                            className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                            onClick={() => {
                                setLocale(locale === 'zh' ? 'en' : 'zh');
                            }}
                        >
                            {locale === 'zh' ? 'English' : '中文'}
                        </button>
                    </nav>
                </SheetContent>
            </Sheet>
        </>
    );
}
