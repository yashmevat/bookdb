// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import { generateToken } from '@/lib/auth';

// Role constants
const ROLE_SUPERADMIN = 1;
const ROLE_AUTHOR = 2;
const ROLE_USER = 3;

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Fetch user with role information using JOIN
    const [rows] = await pool.query(
      `SELECT u.*, r.role_name 
       FROM users u 
       JOIN roles r ON r.id = u.role_id 
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken(user);

    // Determine redirect URL based on role_id
    let redirectUrl;
    switch(user.role_id) {
      case ROLE_SUPERADMIN:
        redirectUrl = '/dashboard/authors';
        break;
      case ROLE_AUTHOR:
        redirectUrl = '/author/books';
        break;
      case ROLE_USER:
        redirectUrl = '/';
        break;
      default:
        redirectUrl = '/';
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name
      },
      redirectUrl
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
