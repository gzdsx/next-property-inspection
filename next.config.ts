import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
    reactStrictMode: false,
    allowedDevOrigins: ['shop.gzdsx.cn'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'shop.gzdsx.cn',
            },
        ],
    },
};

export default nextConfig;
