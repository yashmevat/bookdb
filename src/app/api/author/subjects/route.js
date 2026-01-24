// app/api/author/subjects/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

const ROLE_AUTHOR = 2;

// GET - Fetch subjects assigned to logged-in author
export async function GET() {
  try {
    const user = await getUser();
    
    if (!user || user.role_id !== ROLE_AUTHOR) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get subjects assigned to this author through author_subjects mapping
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.description, s.created_at 
       FROM subjects s
       INNER JOIN author_subjects aus ON s.id = aus.subject_id
       WHERE aus.author_id = ?
       ORDER BY s.name ASC`,
      [user.id] // Changed from user.userId to user.id
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching author subjects:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
