import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
    reactStrictMode: false,
    allowedDevOrigins: ['inspection.noodlebox.ie'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'inspection.noodlebox.ie',
            },
        ],
    },
    typescript: {
        // 警告：这会允许有 TS 错误的代码成功打包，请确保你知晓风险
        ignoreBuildErrors: true,
    }
};

export default nextConfig;
