import {auth} from "@/auth"; // 服务端获取 session
import {getSession} from "next-auth/react"; // 客户端获取 session

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface FetchOptions extends RequestInit {
    data?: any;
    params?: Record<string, any>;
}

async function getAuthSession() {
    // 判断环境：如果 window 不存在，说明在服务端
    if (typeof window === "undefined") {
        return await auth();
    }
    return await getSession();
}

export async function apiFetch(endpoint: string, {data, params, ...options}: FetchOptions = {}) {
    // 1. 处理 URL 参数
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const url = `${BASE_URL}${endpoint}${queryString}`;

    // 2. 默认 Headers 配置
    const headers = new Headers({
        ...options.headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    });

    // 3. 自动注入 Token (如果是 Token 认证方案)
    // 如果是 Sanctum Cookie 方案，fetch 会自动携带凭证，无需手动加 Authorization
    const session = await getAuthSession();
    const token = (session as any)?.accessToken;

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const isServer = typeof window === 'undefined';
    if (isServer) {
        try {
            const {headers: getHeaders} = await import('next/headers');
            const headerStore = await getHeaders();

            // 按照优先级获取真实 IP：Cloudflare -> 现有转发链路 -> 节点 IP
            const realIp = headerStore.get('cf-connecting-ip') ||
                headerStore.get('x-forwarded-for')?.split(',')[0] ||
                '';

            if (realIp) {
                // 显式设置，让 Laravel 的 TrustProxies 能够识别
                headers.set('X-Real-IP', realIp);
                headers.set('X-Forwarded-For', realIp);
            }
        } catch (e) {
            // 在某些非请求上下文（如静态生成）中调用 headers() 会报错
            console.warn('Unable to access headers in current context.');
        }
    }

    if (data) {
        if (data instanceof FormData) {
            options.body = data;
            headers.delete('Content-Type');
        } else {
            options.body = JSON.stringify(data);
        }
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers: headers,
            //credentials: 'include',
        });

        // 4. 统一错误拦截
        if (response.status === 401) {
            // 处理未授权，例如跳转登录
            if (typeof window !== 'undefined') window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
        }

        if (!response.ok) {
            const errorData = await response.json();
            //console.log('response:',errorData);
            throw {
                status: errorData.code,
                message: errorData.message || '请求失败',
                errors: errorData.errors, // Laravel 的表单验证错误通常放在这里
            };
        }

        // 204 No Content 处理
        if (response.status === 204) return null;

        return await response.json();
    } catch (error) {
        return Promise.reject(error);
    }
}

export function apiGet(endpoint: string, params?: Record<string, any>, options?: FetchOptions) {
    return apiFetch(endpoint, {...options, params, method: 'GET'});
}

export function apiPost(endpoint: string, data?: any, options?: FetchOptions) {
    return apiFetch(endpoint, {...options, data, method: 'POST'});
}

export function apiPut(endpoint: string, data?: any, options?: FetchOptions) {
    return apiFetch(endpoint, {...options, data, method: 'PUT'});
}

export function apiDelete(endpoint: string, data?: any, options?: FetchOptions) {
    return apiFetch(endpoint, {...options, data, method: 'DELETE'});
}
