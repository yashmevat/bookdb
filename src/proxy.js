// proxy.js (root level ya src/ ke andar)
import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export function proxy(request) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  console.log('🔍 Proxy Check:', { pathname, hasToken: !!token }); // Debug log

  // Login page - redirect if already logged in
  if (pathname === '/login') {
    if (token) {
      try {
        const decoded = verifyToken(token);
        console.log('✅ Token Valid:', decoded); // Debug log
        
        if (decoded) {
          const redirectUrl = decoded.role === 'superadmin' 
            ? '/dashboard/authors' 
            : decoded.role === 'author' 
            ? '/author/books' 
            : '/';

          console.log('🔄 Redirecting to:', redirectUrl); // Debug log
          return NextResponse.redirect(new URL(redirectUrl, request.url));
        }
      } catch (error) {
        console.error('❌ Token verification failed:', error);
        // Invalid token - clear it and allow login
        const response = NextResponse.next();
        response.cookies.set('token', '', { maxAge: 0 }); // Clear cookie
        return response;
      }
    }
    return NextResponse.next();
  }

  // Protected dashboard routes (superadmin only)
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      console.log('⚠️ No token - redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.role !== 'superadmin') {
        console.log('⚠️ Invalid role - redirecting to login');
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('token', '', { maxAge: 0 });
        return response;
      }

      console.log('✅ Dashboard access granted');
      return NextResponse.next();
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('token', '', { maxAge: 0 });
      return response;
    }
  }

  // Protected author routes (author role only)
  if (pathname.startsWith('/author')) {
    if (!token) {
      console.log('⚠️ No token - redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.role !== 'author') {
        console.log('⚠️ Invalid role - redirecting to login');
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('token', '', { maxAge: 0 });
        return response;
      }

      console.log('✅ Author access granted');
      return NextResponse.next();
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('token', '', { maxAge: 0 });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/author/:path*', 
    '/login'
  ]
};
