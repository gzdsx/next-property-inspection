'use client';

import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {Sparkles} from 'lucide-react';
import {signIn} from 'next-auth/react';
import {useLocale, useTranslations} from '@/contexts/LocaleContext';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {Spinner} from "@/components/ui/spinner";

const LoginClient = () => {
    const {t} = useTranslations('login');
    const {locale, setLocale} = useLocale();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const formSchema = z.object({
        email: z.string().min(1, t('name')),
        password: z.string().min(1, t('password')),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        setErrorMessage('');
        try {
            const result = await signIn('sanctum', {
                email: values.email,
                password: values.password,
                redirect: false,
            });

            if (result?.error) {
                setErrorMessage(t('loginFail'));
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.log('login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex flex-col min-h-screen bg-linear-to-tr from-slate-900 via-slate-800 to-indigo-950 text-slate-100 font-sans items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative Orbs */}
            <div
                className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"/>
            <div
                className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"/>

            {/* Language Selector */}
            <button
                onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
                className="absolute top-6 right-6 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-colors"
            >
                {locale === 'zh' ? 'English' : '中文'}
            </button>

            <Card className="w-full max-w-md bg-white/5 backdrop-blur-md p-4! border-white/10 shadow-2xl relative z-10 rounded-2xl">
                <CardHeader className="flex flex-col items-center gap-3 pb-2">
                    <div
                        className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/25">
                        <Sparkles className="w-7 h-7"/>
                    </div>
                    <CardTitle className="text-2xl font-extrabold tracking-tight text-white">
                        {t('title')}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-400">
                        {t('description')}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6!">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel
                                            className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                            {t('name')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Zhu"
                                                className="h-11"
                                                {...field}
                                            />
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
                                        <FormLabel
                                            className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                            {t('password')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                className="h-11"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            {errorMessage && (
                                <div className="text-red-400 text-sm font-medium text-center">{errorMessage}</div>
                            )}

                            <Button
                                type="submit"
                                variant={'secondary'}
                                disabled={loading}
                                className="w-full h-11 bg-blue-600 hover:bg-blue-500"
                            >
                                {loading ? <Spinner/> : t('login')}
                            </Button>
                        </form>
                    </Form>

                    <div className="text-center text-[10px] text-slate-500 mt-6">
                        Irish Property Inspection System &copy; {new Date().getFullYear()}
                    </div>
                </CardContent>
            </Card>
        </main>
    );
};

export default LoginClient;