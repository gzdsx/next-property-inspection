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
};

export default nextConfig;
