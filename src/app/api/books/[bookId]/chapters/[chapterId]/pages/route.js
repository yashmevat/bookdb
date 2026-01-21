// app/api/books/[bookId]/chapters/[chapterId]/pages/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { bookId, chapterId } = await params;

    const [rows] = await pool.query(
      `SELECT p.id, p.content, p.created_at
       FROM pages p 
       INNER JOIN chapters c ON p.chapter_id = c.id
       WHERE c.id = ? AND c.book_id = ?
       ORDER BY p.id ASC`,
      [chapterId, bookId]
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
