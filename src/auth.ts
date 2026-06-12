import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials";
import {apiPost} from "@/lib/api";

export const {handlers, auth} = NextAuth({
    trustHost: true,
    providers: [
        CredentialsProvider({
            id: "sanctum",
            name: "Laravel Backend",
            credentials: {
                email: {label: "Emial", type: "text"},
                password: {label: "Password", type: "password"}
            },
            async authorize(credentials) {
                // 调用你的 Laravel 接口
                try {
                    const res = await apiPost("/auth/login", credentials);
                    // 验证成功后，返回的对象会被存入 JWT
                    if (res.data.access_token && res.data.user) {
                        return {...res.data.user, accessToken: res.data.access_token};
                    }
                    return null;
                } catch (e) {
                    console.log('e:', e);
                    throw e;
                }
            }
        })
    ],
    callbacks: {
        // 1. 将 Token 和 User 信息存入 JWT 中
        async jwt({token, user, trigger, session}) {
            // ⚡ 核心：拦截手动更新触发器
            if (trigger === "update" && session) {
                // 将前端传过来的 session 数据合入到当前的 token 中
                return {...token, ...session};
            }
            return {...token, ...user};
        },
        // 2. 将 JWT 中的信息暴露给前端 session
        async session({session, token}) {
            (session as any).accessToken = token.accessToken as string;
            (session as any).user.avatar = token.avatar as string;
            (session as any).user.phone_number = token.phone_number as string;
            (session as any).user.user_type = token.user_type as string;
            (session as any).user.reference = token.reference as string;
            (session as any).user.company_name = token.company_name as string;
            (session as any).user.id = token.id;
            return session;
        }
    },
    session: {
        strategy: "jwt", // 使用 JWT 策略
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/error',
    },
    debug: true,
    secret: process.env.NEXTAUTH_SECRET,
});
