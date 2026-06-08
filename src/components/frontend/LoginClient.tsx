'use client';

import React, {useState} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {FormControl, FormField, FormItem, FormLabel, FormMessage, Form} from '@/components/ui/form';
import {signIn} from 'next-auth/react';
import {useTranslations} from '@/contexts/LocaleContext';

export default function LoginClient() {
    const {t} = useTranslations('ecommerce');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);

    const formSchema = z.object({
        account: z.string().min(1, t('auth.accountRequired')),
        password: z.string().min(1, t('auth.passwordRequired')),
        remember: z.boolean(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            account: '',
            password: '',
            remember: true,
        },
    });

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            const result = await signIn('sanctum', {
                account: values.account,
                password: values.password,
                redirect: false,
            });

            if (result?.error) {
                console.log(result.error);
            } else {
                const callbackUrl = searchParams.get('callbackUrl') || '/';
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (error) {
            console.log('login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <Card className="w-full max-w-md shadow-lg border-0">
                <CardContent className="pt-6">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">{t('auth.login')}</h1>
                        <p className="text-sm text-gray-500 mt-2">{t('auth.welcomeBack')}</p>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" autoComplete="off">
                            <FormField
                                control={form.control}
                                name="account"
                                render={({field}) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder={t('auth.account')} className="h-11" {...field} />
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
                            <div className="flex items-center justify-between">
                                <FormField
                                    control={form.control}
                                    name="remember"
                                    render={({field}) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-sm font-normal cursor-pointer">
                                                {t('auth.rememberMe')}
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <a className="text-sm text-gray-700 hover:text-gray-900">{t('auth.forgotPassword')}</a>
                            </div>
                            <Button type="submit" className="w-full h-11" disabled={loading}>
                                {loading ? t('auth.login') + '...' : t('auth.login')}
                            </Button>
                        </form>
                    </Form>
                    <div className="text-center text-sm text-gray-500 mt-4">
                        {t('auth.noAccount')}{' '}
                        <Link href="/register"
                              className="text-gray-700 hover:text-gray-900 font-medium">{t('auth.registerNow')}</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
