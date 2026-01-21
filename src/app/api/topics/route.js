// app/api/topics/route.js
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
      'SELECT t.*, s.name as subject_name FROM topics t LEFT JOIN subjects s ON t.subject_id = s.id ORDER BY t.created_at DESC'
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

    const { name, description, subject_id } = await request.json();
    
    const [result] = await pool.query(
      'INSERT INTO topics (name, description, subject_id) VALUES (?, ?, ?)',
      [name, description, subject_id]
    );
    
    return NextResponse.json({ 
      success: true, 
      data: { id: result.insertId, name, description, subject_id } 
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
    
    await pool.query('DELETE FROM topics WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
