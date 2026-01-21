// app/api/books/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT 
        b.id, 
        b.title, 
        b.created_at,
        s.name as subject_name, 
        t.name as topic_name,
        u.username as author_name
       FROM books b 
       LEFT JOIN subjects s ON b.subject_id = s.id 
       LEFT JOIN topics t ON b.topic_id = t.id 
       LEFT JOIN users u ON b.author_id = u.id
       ORDER BY b.created_at DESC`
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
