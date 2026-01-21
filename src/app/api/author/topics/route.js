// app/api/author/topics/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

// GET - Fetch topics for a specific subject
export async function GET(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject_id = searchParams.get('subject_id');

    if (!subject_id) {
      return NextResponse.json(
        { success: false, error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    // Verify author has access to this subject
    const [subjectCheck] = await pool.query(
      `SELECT aus.id FROM author_subjects aus 
       WHERE aus.author_id = ? AND aus.subject_id = ?`,
      [user.userId, subject_id]
    );

    if (subjectCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this subject' },
        { status: 403 }
      );
    }

    // Get topics for this subject
    const [rows] = await pool.query(
      'SELECT id, name, description, subject_id, created_at FROM topics WHERE subject_id = ? ORDER BY name ASC',
      [subject_id]
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
