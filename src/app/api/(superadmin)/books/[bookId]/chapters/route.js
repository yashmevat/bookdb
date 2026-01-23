// app/api/books/[bookId]/chapters/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { bookId } = await params;

    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.order_num, c.created_at
       FROM chapters c 
       WHERE c.book_id = ?
       ORDER BY c.order_num ASC, c.created_at ASC`,
      [bookId]
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
