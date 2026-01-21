// app/api/author/subjects/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

// GET - Fetch subjects assigned to logged-in author
export async function GET() {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get subjects assigned to this author through author_subjects mapping
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.description, s.created_at 
       FROM subjects s
       INNER JOIN author_subjects aus ON s.id = aus.subject_id
       WHERE aus.author_id = ?
       ORDER BY s.name ASC`,
      [user.userId]
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
