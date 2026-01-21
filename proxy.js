// proxy.js
import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export function proxy(request) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Login page - redirect if already logged in
  if (pathname === '/login') {
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.role === 'superadmin') {
        return NextResponse.redirect(new URL('/dashboard/authors', request.url));
      } else if (decoded && decoded.role === 'author') {
        return NextResponse.redirect(new URL('/author/books', request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'superadmin') {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
};
