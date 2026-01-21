// app/api/author/books/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

// GET - Fetch all books for logged-in author
export async function GET() {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await pool.query(
      `SELECT b.*, s.name as subject_name, t.name as topic_name 
       FROM books b 
       LEFT JOIN subjects s ON b.subject_id = s.id 
       LEFT JOIN topics t ON b.topic_id = t.id 
       WHERE b.author_id = ?
       ORDER BY b.created_at DESC`,
      [user.userId]
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create new book
export async function POST(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { title, subject_id, topic_id } = await request.json();
    
    // Validate required fields
    if (!title || !subject_id || !topic_id) {
      return NextResponse.json(
        { success: false, error: 'Title, subject_id, and topic_id are required' },
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

    // Verify topic belongs to subject
    const [topicCheck] = await pool.query(
      'SELECT id FROM topics WHERE id = ? AND subject_id = ?',
      [topic_id, subject_id]
    );

    if (topicCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Topic does not belong to selected subject' },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      'INSERT INTO books (title, author_id, subject_id, topic_id) VALUES (?, ?, ?, ?)',
      [title, user.userId, subject_id, topic_id]
    );
    
    return NextResponse.json({ 
      success: true, 
      data: { id: result.insertId, title, subject_id, topic_id } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update book
export async function PUT(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, title, subject_id, topic_id } = await request.json();
    
    if (!id || !title || !subject_id || !topic_id) {
      return NextResponse.json(
        { success: false, error: 'ID, title, subject_id, and topic_id are required' },
        { status: 400 }
      );
    }

    // Verify book belongs to author
    const [bookCheck] = await pool.query(
      'SELECT id FROM books WHERE id = ? AND author_id = ?',
      [id, user.userId]
    );

    if (bookCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Book not found or unauthorized' },
        { status: 403 }
      );
    }

    // Verify author has access to subject
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

    // Verify topic belongs to subject
    const [topicCheck] = await pool.query(
      'SELECT id FROM topics WHERE id = ? AND subject_id = ?',
      [topic_id, subject_id]
    );

    if (topicCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Topic does not belong to selected subject' },
        { status: 400 }
      );
    }
    
    await pool.query(
      'UPDATE books SET title = ?, subject_id = ?, topic_id = ? WHERE id = ? AND author_id = ?',
      [title, subject_id, topic_id, id, user.userId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete book
export async function DELETE(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Verify book belongs to author
    const [bookCheck] = await pool.query(
      'SELECT id FROM books WHERE id = ? AND author_id = ?',
      [id, user.userId]
    );

    if (bookCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Book not found or unauthorized' },
        { status: 403 }
      );
    }

    await pool.query(
      'DELETE FROM books WHERE id = ? AND author_id = ?', 
      [id, user.userId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
