import {auth} from "@/auth"
import {NextResponse} from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const {nextUrl} = req;

    const isCheckoutRoute = nextUrl.pathname.startsWith("/checkout");
    const isAuthRoute = nextUrl.pathname.startsWith("/user");
    if (isLoggedIn && nextUrl.pathname.startsWith("/auth/login")) {
        return NextResponse.redirect(new URL('/user/profile', nextUrl));
    }

    // 1. 如果没登录且试图访问受限页面
    if (!isLoggedIn && (isAuthRoute || isCheckoutRoute) && !nextUrl.pathname.startsWith("/auth/login")) {
        const loginUrl = new URL("/auth/login", nextUrl);
        loginUrl.searchParams.set("redirect", nextUrl.href);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
})

export const config = {
    matcher: ["/user/:path*", "/auth/:path*", "/checkout"],
}
