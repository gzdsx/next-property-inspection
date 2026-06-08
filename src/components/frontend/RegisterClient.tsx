'use client';

import React, {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {FormControl, FormField, FormItem, FormLabel, FormMessage, Form} from '@/components/ui/form';
import {toast} from 'sonner';
import {signIn} from 'next-auth/react';
import {apiPost} from '@/lib/api';
import {useTranslations} from '@/contexts/LocaleContext';

export default function RegisterClient() {
    const {t} = useTranslations('ecommerce');
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const formSchema = z.object({
        username: z.string().min(1, t('auth.usernameRequired')),
        email: z.string().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
        password: z.string().min(1, t('auth.passwordRequired')).min(6, t('auth.passwordMinLength')),
        confirmPassword: z.string().min(1, t('auth.confirmPasswordRequired')),
        agree: z.boolean().refine(val => val, {message: t('auth.agreeTermsRequired')}),
    }).refine(data => data.password === data.confirmPassword, {
        message: t('auth.passwordMismatch'),
        path: ['confirmPassword'],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            agree: false,
        },
    });

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            await apiPost('/auth/register', {
                name: values.username,
                email: values.email,
                password: values.password,
            });
            toast.success(t('auth.registerSuccess'));
            await signIn('sanctum', {
                redirect: false,
                account: values.email,
                password: values.password,
            });
            router.push('/');
            router.refresh();
        } catch (error: any) {
            toast.error(error?.message || t('auth.registerFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <Card className="w-full max-w-md shadow-lg border-0">
                <CardContent className="pt-6">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">{t('auth.register')}</h1>
                        <p className="text-sm text-gray-500 mt-2">{t('auth.registerSubtitle')}</p>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({field}) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder={t('user.nickname')} className="h-11" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({field}) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input type="email" placeholder="Email" className="h-11" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({field}) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input type="password" placeholder={t('auth.password')}
                                                   className="h-11" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({field}) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input type="password" placeholder={t('auth.confirmPassword')}
                                                   className="h-11" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="agree"
                                render={({field}) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                            {t('auth.agreeTerms')}
                                        </FormLabel>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full h-11" disabled={loading}>
                                {loading ? t('auth.register') + '...' : t('auth.register')}
                            </Button>
                        </form>
                    </Form>
                    <div className="text-center text-sm text-gray-500 mt-4">
                        {t('auth.hasAccount')}{' '}
                        <Link href="/login"
                              className="text-gray-700 hover:text-gray-900 font-medium">{t('auth.loginNow')}</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
