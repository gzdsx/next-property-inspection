'use client';

import Link from "next/link";
import React, {useState} from "react";
import {signOut} from "next-auth/react";
import {usePathname, useRouter} from "next/navigation";
import {BarChart3, HomeIcon, LogOut, Moon, Settings, Sparkles, Sun, Users, Video} from "lucide-react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

const queryClient = new QueryClient();

export const RootLayoutClient = ({children}: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [inspectorProfile, setInspectorProfile] = useState<any>({});
    const theme = 'dark';

    const navItems = [
        {href: '/', icon: HomeIcon, title: 'Dashboard'},
        {href: '/staff', icon: Users, title: 'Staff Management'},
        {href: '/analytics', icon: BarChart3, title: 'Analytics'},
        {href: '/profile', icon: Settings, title: 'Profile'},
    ];

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };
    return (
        <QueryClientProvider client={queryClient}>
            <div className="dashboard-layout">
                <aside className="sidebar">
                    <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
                        <div className="sidebar-logo">
                            <Sparkles size={24}/>
                        </div>
                        <nav className="sidebar-menu">
                            {navItems.map(item => (
                                <div
                                    key={item.href}
                                    title={item.title}
                                    className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                                >
                                    <Link href={item.href}>
                                        <item.icon size={22}/>
                                    </Link>
                                </div>
                            ))}
                        </nav>
                    </div>

                    {/* User Avatar & Menu */}
                    <div style={{position: "relative"}}>
                        <div className="sidebar-avatar" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                            {"Z"}
                        </div>

                        {isProfileOpen && (
                            <div className="profile-popup">
                                <div className="profile-popup-item" style={{
                                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                                    paddingBottom: "12px",
                                    cursor: "default"
                                }}>
                                    <div>
                                        <p style={{
                                            margin: 0,
                                            fontWeight: "bold",
                                            fontSize: "0.85rem",
                                            color: "var(--foreground)"
                                        }}>
                                            {inspectorProfile.inspectorName}
                                        </p>
                                        <p style={{margin: 0, fontSize: "0.7rem", color: "var(--text-muted)"}}>
                                            {inspectorProfile.companyName}
                                        </p>
                                    </div>
                                </div>
                                <div className="profile-popup-item" onClick={() => {
                                    setIsProfileOpen(false);
                                }}>
                                    {theme === "dark" ? <Sun size={16}/> : <Moon size={16}/>}
                                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                                </div>
                                <div className="profile-popup-item" onClick={() => {
                                    setIsProfileOpen(false);
                                    router.push('/profile');
                                }}>
                                    <Settings size={16}/>
                                    <span>Settings</span>
                                </div>
                                <div className="profile-popup-item" style={{color: "var(--danger)"}}
                                     onClick={async () => {
                                         await signOut();
                                     }}>
                                    <LogOut size={16}/>
                                    <span>Log Out</span>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <div className="main-viewport">
                    <main className="main-content">
                        {children}
                    </main>
                </div>
            </div>
        </QueryClientProvider>
    );
};