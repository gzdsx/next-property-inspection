'use client';

import {Sparkles} from "lucide-react";
import {useLocale, useTranslations} from "@/contexts/LocaleContext";
import {useState} from "react";
import {signIn} from 'next-auth/react';

const LoginClient2 = () => {
    const {t} = useTranslations('login');
    const {locale, setLocale} = useLocale();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loging, setLoging] = useState(false);

    const handleLoginSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoging(true);
        setErrorMessage('');
        try {
            const result = await signIn('sanctum', {
                email: email,
                password: password,
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
            setLoging(false);
        }
    }

    return (
        <main
            className="flex flex-col min-h-screen bg-linear-to-tr from-slate-900 via-slate-800 to-indigo-950 text-slate-100 font-sans items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative Orbs */}
            <div
                className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"/>
            <div
                className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"/>

            {/* Language selector in login */}
            <button
                onClick={() => {
                    setLocale(locale === 'zh' ? 'en' : 'zh');
                }}
                className="absolute top-6 right-6 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-colors"
            >
                {locale === 'zh' ? 'English' : '中文'}
            </button>

            <div
                className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative z-10">
                <div className="text-center">
                    <div
                        className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-400/25">
                        <Sparkles className="w-7 h-7"/>
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
                        {t('title')}
                    </h2>
                    <p className="text-xs text-slate-400">
                        {t('description')}
                    </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                            {t('name')}
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Zhu"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full pl-4 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                            {t('password')}
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full pl-4 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all font-medium"
                        />
                    </div>

                    {
                        errorMessage && <div className="text-red-500 text-sm">{errorMessage}</div>
                    }

                    <button
                        type="submit"
                        disabled={loging}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/35 mt-2"
                    >
                        {t('login')}
                    </button>
                </form>

                <div className="text-center text-[10px] text-slate-500">
                    Irish Property Inspection System &copy; {new Date().getFullYear()}
                </div>
            </div>
        </main>
    );
};

export default LoginClient2;