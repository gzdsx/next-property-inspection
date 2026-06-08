'use client';

import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {FormControl, FormField, FormItem, FormLabel, FormMessage, Form} from '@/components/ui/form';
import {toast} from 'sonner';
import {User} from 'lucide-react';
import {useTranslations} from '@/contexts/LocaleContext';

interface ProfileClientProps {
    session: any;
}

export default function ProfileClient({session}: ProfileClientProps) {
    const {t} = useTranslations('ecommerce');
    const [loading, setLoading] = useState(false);

    const profileSchema = z.object({
        name: z.string().min(1, t('auth.usernameRequired')),
        email: z.string().email(),
    });

    const profileForm = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: session.user?.name || '',
            email: session.user?.email || '',
        },
    });

    const passwordSchema = z.object({
        current_password: z.string().min(1, t('auth.passwordRequired')),
        new_password: z.string().min(6, t('auth.passwordMinLength')),
        confirm_new_password: z.string().min(1, t('auth.confirmPasswordRequired')),
    }).refine(data => data.new_password === data.confirm_new_password, {
        message: t('auth.passwordMismatch'),
        path: ['confirm_new_password'],
    });

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            current_password: '',
            new_password: '',
            confirm_new_password: '',
        },
    });

    const handleProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
        setLoading(true);
        try {
            toast.success(t('user.updateSuccess'));
        } catch {
            toast.error(t('user.updateFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
        // TODO: implement password change API call
        toast.success(t('user.updateSuccess'));
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('user.profileSettings')}</h1>
            <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-8">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={session.user?.image}/>
                            <AvatarFallback>
                                <User size={32}/>
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="text-lg font-semibold">{session.user?.name || t('user.defaultName')}</h3>
                            <p className="text-sm text-gray-500">{session.user?.email}</p>
                        </div>
                    </div>
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                            <FormField
                                control={profileForm.control}
                                name="name"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>{t('user.nickname')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('user.nickname')} className="h-11" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="email"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Email" className="h-11" disabled {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={loading}>
                                {loading ? t('user.updateProfile') + '...' : t('user.updateProfile')}
                            </Button>
                        </form>
                    </Form>
                    <div className="border-t border-gray-100 pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('user.changePassword')}</h3>
                        <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                                <FormField
                                    control={passwordForm.control}
                                    name="current_password"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>{t('user.currentPassword')}</FormLabel>
                                            <FormControl>
                                                <Input type="password" className="h-11" {...field} />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={passwordForm.control}
                                    name="new_password"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>{t('user.newPassword')}</FormLabel>
                                            <FormControl>
                                                <Input type="password" className="h-11" {...field} />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={passwordForm.control}
                                    name="confirm_new_password"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>{t('user.confirmNewPassword')}</FormLabel>
                                            <FormControl>
                                                <Input type="password" className="h-11" {...field} />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit">{t('user.changePassword')}</Button>
                            </form>
                        </Form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
