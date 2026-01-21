// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
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

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      // Send redirect URL in response
      redirectUrl: user.role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/author'
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
