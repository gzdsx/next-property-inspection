'use client';

import { useEffect } from 'react';

interface AdBannerProps {
    dataAdSlot: string;
    dataAdFormat?: string;
    dataFullWidthResponsive?: boolean;
}

const AdsenseBanner = ({
                      dataAdSlot,
                      dataAdFormat = 'auto',
                      dataFullWidthResponsive = true,
                  }: AdBannerProps) => {
    useEffect(() => {
        try {
            // 每次组件挂载时，尝试推送广告
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error:", e);
        }
    }, []);

    return (
        <div style={{ overflow: 'hidden', margin: '10px 0' }}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-7306822352785197" // 替换为你的 PID
                data-ad-slot={dataAdSlot}
                data-ad-format={dataAdFormat}
                data-full-width-responsive={dataFullWidthResponsive.toString()}
            />
        </div>
    );
};

export default AdsenseBanner;
