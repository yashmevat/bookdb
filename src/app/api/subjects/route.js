// app/api/subjects/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await pool.query(
      'SELECT s.*, u.username as created_by_name FROM subjects s LEFT JOIN users u ON s.created_by = u.id ORDER BY s.created_at DESC'
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

    const { name, description } = await request.json();
    
    const [result] = await pool.query(
      'INSERT INTO subjects (name, description, created_by) VALUES (?, ?, ?)',
      [name, description, user.userId]
    );
    
    return NextResponse.json({ 
      success: true, 
      data: { id: result.insertId, name, description } 
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
    
    await pool.query('DELETE FROM subjects WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
