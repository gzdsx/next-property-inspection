'use client';

import {useLocale} from "@/contexts/LocaleContext";
import {cn} from "@/lib/utils";

const LangSwitchButton = ({className}: { className?: string }) => {
    const {locale, setLocale} = useLocale();
    return (
        <button
            type="button"
            onClick={() => {
                setLocale(locale === 'zh' ? 'en' : 'zh');
            }}
            className={
                cn(
                    'flex items-center justify-center w-11 h-11 bg-slate-100 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-200 active:scale-90 transition-all shadow-sm',
                    className
                )
            }
        >
            {locale === 'zh' ? 'EN' : '中'}
        </button>
    );
};

export default LangSwitchButton;