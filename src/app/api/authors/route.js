// app/api/authors/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await pool.query(
      "SELECT id, username, email, role, created_at FROM users WHERE role = 'author' ORDER BY created_at DESC"
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { username, email, password } = await request.json();
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'author']
    );
    
    return NextResponse.json({ 
      success: true, 
      data: { id: result.insertId, username, email, role: 'author' } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await pool.query('DELETE FROM users WHERE id = ? AND role = ?', [id, 'author']);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
