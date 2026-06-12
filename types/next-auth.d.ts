// types/next-auth.d.ts
import NextAuth, {DefaultSession} from "next-auth"
import {JWT} from "next-auth/jwt"

declare module "next-auth" {
    /**
     * 扩充 User 对象，增加你从 Laravel API 或数据库获取的属性
     */
    interface User {
        id?: string;
        name: string;
        avatar: string;
        user_type: string; // 在这里定义你的属性
        company?: string;
        phone_number: string;
        reference:string;
    }

    /**
     * 扩充 Session 对象，确保在组件中调用 useSession 时能看到这些属性
     */
    interface Session {
        user: {

        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    /** 扩充 JWT 对象，确保在 middleware 中能读取到这些属性 */
    interface JWT {
        role?: string;
    }
}
