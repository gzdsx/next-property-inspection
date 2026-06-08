import Cookies from "js-cookie";

interface FetchOptions extends RequestInit {
    data?: any;
    params?: Record<string, any>;
}

function serializeParams(params: Record<string, any>) {
    const parts = [];
    for (const key in params) {
        const value = params[key];
        if (value == null || value === 'all') continue;

        if (Array.isArray(value)) {
            value.forEach(item => {
                parts.push(`${key}[]=${item}`);
            });
        } else {
            parts.push(`${key}=${value}`);
        }
    }
    return parts.join('&');
}

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function apiFetch(endpoint: string, {data, params, ...options}: FetchOptions = {}) {
    // 1. 处理 URL 参数
    let url = `${BASE_URL}${endpoint}`;
    if (params) {
        url += '?' + serializeParams(params);
    }

    // 2. 默认 Headers 配置
    const headers = new Headers({
        ...options.headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    });

    // 3. 自动注入 Token (如果是 Token 认证方案)
    const token = Cookies.get('adminToken');
    headers.set('Authorization', `Bearer ${token}`);

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
            credentials: 'include',
        });

        // 4. 统一错误拦截
        if (response.status === 401) {
            // 处理未授权，例如跳转登录
            if (typeof window !== 'undefined') {
                Cookies.remove('adminToken');
                Cookies.remove('adminUser');
                window.location.reload();
            }
        }

        // 5. 正确处理 204 No Content (它是成功，不是错误)
        if (response.status === 204) {
            return null;
        }

        // 6. 安全解析 JSON (防止非 JSON 格式导致崩溃)
        const isJson = response.headers.get('content-type')?.includes('application/json');
        const responseData = isJson ? await response.json() : null;

        if (!response.ok) {
            throw {
                status: response.status,
                message: responseData?.message || `请求失败 (${response.status})`,
                errors: responseData?.errors, // 完美兼容 Laravel 表单验证错误
            };
        }

        return responseData;
    } catch (error) {
        // 如果已经是格式化好的错误对象则直接抛出，否则包装原生的网络错误（如 net::ERR_CONNECTION_REFUSED）
        if (error && (error as any).status) {
            return Promise.reject(error);
        }
        return Promise.reject({
            status: 0,
            message: error instanceof Error ? error.message : '网络连接异常，请检查后端服务是否启动',
        });
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
