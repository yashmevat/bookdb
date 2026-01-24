// app/api/mappings/author-subjects/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role_id !== 1) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await pool.query(
      `SELECT aus.*, u.username as author_name, s.name as subject_name 
       FROM author_subjects aus 
       LEFT JOIN users u ON aus.author_id = u.id 
       LEFT JOIN subjects s ON aus.subject_id = s.id 
       ORDER BY aus.assigned_at DESC`
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user || user.role_id !== 1) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { author_id, subject_id } = await request.json();
    
    const [result] = await pool.query(
      'INSERT INTO author_subjects (author_id, subject_id) VALUES (?, ?)',
      [author_id, subject_id]
    );
    
    return NextResponse.json({ 
      success: true, 
      data: { id: result.insertId, author_id, subject_id } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getUser();
    if (!user || user.role_id !== 1) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await pool.query('DELETE FROM author_subjects WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
