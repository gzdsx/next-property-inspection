'use client';

import {useEffect, useState} from 'react';
import {
    Plus, Search, Pencil, Trash2, Loader2, Check, Users, Camera,
} from 'lucide-react';
import {apiGet, apiPost, apiPut, apiDelete} from '@/lib/api';
import {toast} from 'sonner';
import type {User} from '@/types';
import {Button} from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {useMediaPicker} from '@/contexts/AppContext';

const USER_TYPES: Record<string, { label: string; class: string }> = {
    owner: {label: 'Owner', class: 'bg-purple-500/15 text-purple-400'},
    manager: {label: 'Manager', class: 'bg-blue-500/15 text-blue-400'},
    staff: {label: 'Staff', class: 'bg-emerald-500/15 text-emerald-400'},
    viewer: {label: 'Viewer', class: 'bg-gray-500/15 text-gray-400'},
};

const emptyForm = {name: '', email: '', phone_number: '', password: '', avatar: ''};

export default function StaffPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const mediaPicker = useMediaPicker();

    const [deletingId, setDeletingId] = useState<number | null>(null);

    // ─── Fetch ────────────────────────────────────────────────────────────────

    const fetchUsers = async () => {
        try {
            const res = await apiGet('/staffs');
            setUsers(res.data?.items || res.items || res.data || res || []);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load staff');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // ─── Dialog ───────────────────────────────────────────────────────────────

    const openCreate = () => {
        setEditingUser(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setForm({
            name: user.name || '',
            email: user.email || '',
            phone_number: user.phone_number || '',
            password: '',
            avatar: user.avatar || '',
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload: any = {...form};
            if (!payload.password) delete payload.password;

            if (editingUser) {
                const updated = await apiPut(`/staffs/${editingUser.id}`, payload);
                setUsers(prev => prev.map(u => u.id === editingUser.id ? {...u, ...updated} : u));
                toast.success('Staff member updated');
            } else {
                const created = await apiPost('/staffs', payload);
                setUsers(prev => [...prev, created]);
                toast.success('Staff member created');
            }
            setDialogOpen(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (userId: number) => {
        setDeletingId(userId);
        try {
            await apiDelete(`/staffs/${userId}`);
            setUsers(prev => prev.filter(u => u.id !== userId));
            toast.success('Staff member removed');
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete');
        } finally {
            setDeletingId(null);
        }
    };

    const openAvatarPicker = () => {
        mediaPicker.open({
            onSelect: (items) => {
                if (items.length > 0) {
                    setForm(f => ({...f, avatar: items[0].thumbnail || items[0].src}));
                }
            },
        });
    };

    // ─── Filter ───────────────────────────────────────────────────────────────

    const filtered = users.filter(u => {
        const q = searchQuery.toLowerCase();
        return !q
            || (u.name || '').toLowerCase().includes(q)
            || (u.email || '').toLowerCase().includes(q)
            || (u.phone_number || '').toLowerCase().includes(q);
    });

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            {/* Header */}
            <header className="dashboard-header">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Staff Management</h1>
                    <p className="text-sm text-(--text-muted) mt-0.5">
                        Manage your team members
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 border border-gray-700 rounded-full px-4">
                        <input
                            type="text"
                            className="px-2 py-2 bg-transparent text-sm outline-none text-foreground"
                            placeholder="Search staff..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <Search size={16} className="text-gray-500"/>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-blue-600 rounded-sm px-4 py-2 text-white text-sm font-semibold cursor-pointer"
                    >
                        <Plus size={18}/>
                        Add Staff
                    </button>
                </div>
            </header>

            {/* Table */}
            <div className="glass-panel mx-8 mb-8 overflow-hidden rounded-xl">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500"/>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-(--text-muted)">
                        <Users size={40} className="opacity-30 mb-3"/>
                        <p className="text-sm font-bold">
                            {searchQuery ? 'No matching staff found' : 'No staff members yet'}
                        </p>
                        <p className="text-xs mt-1">
                            {searchQuery ? 'Try a different search term' : 'Click "Add Staff" to get started'}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm" style={{borderCollapse: 'collapse'}}>
                        <thead>
                        <tr className="border-b border-white/8">
                            <th className="text-left px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-(--text-muted)">Name</th>
                            <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-(--text-muted)">Email</th>
                            <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-(--text-muted)">Phone</th>
                            <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-(--text-muted)">Type</th>
                            <th className="text-right px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-(--text-muted)">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(user => (
                            <tr key={user.id}
                                className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-3">
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="w-8 h-8 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                                                {(user.name || '?')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <span className="font-semibold text-foreground">{user.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 text-(--text-muted)">{user.email}</td>
                                <td className="px-4 py-3.5 text-(--text-muted)">{user.phone_number || '-'}</td>
                                <td className="px-4 py-3.5">
                                    {(() => {
                                        const t = USER_TYPES[user.user_type] || {label: user.user_type || '-', class: 'bg-gray-500/15 text-gray-400'};
                                        return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${t.class}`}>{t.label}</span>;
                                    })()}
                                </td>
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button
                                            onClick={() => openEdit(user)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border-none text-(--text-muted) cursor-pointer hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil size={14}/>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            disabled={deletingId === user.id}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border-none text-(--text-muted) cursor-pointer hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                            title="Delete"
                                        >
                                            {deletingId === user.id
                                                ? <Loader2 size={14} className="animate-spin"/>
                                                : <Trash2 size={14}/>
                                            }
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false); }}>
                <DialogContent className="sm:max-w-md"
                               style={{background: 'var(--background)', border: '1px solid var(--panel-border)', overflow: 'hidden'}}>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-2">
                            <div
                                onClick={openAvatarPicker}
                                className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer group/avatar bg-white/5 border-2 border-dashed border-white/15 hover:border-blue-500/50 transition-colors"
                            >
                                {form.avatar ? (
                                    <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-(--text-muted)">
                                        <Users size={28}/>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                    <Camera size={18} className="text-white"/>
                                </div>
                            </div>
                            <span className="text-[0.65rem] text-(--text-muted)">Click to select avatar</span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-(--text-muted)">Name</label>
                            <input
                                value={form.name}
                                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-foreground outline-none"
                                placeholder="Full name"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-(--text-muted)">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-foreground outline-none"
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-(--text-muted)">Phone</label>
                            <input
                                value={form.phone_number}
                                onChange={e => setForm(f => ({...f, phone_number: e.target.value}))}
                                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-foreground outline-none"
                                placeholder="+353 ..."
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-(--text-muted)">
                                {editingUser ? 'New Password (leave blank to keep)' : 'Password'}
                            </label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={e => setForm(f => ({...f, password: e.target.value}))}
                                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-foreground outline-none"
                                placeholder={editingUser ? 'Leave blank to keep current' : 'Set password'}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving || !form.name || !form.email}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Check className="w-4 h-4 mr-1"/>}
                            {editingUser ? 'Save Changes' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </>
    );
}
