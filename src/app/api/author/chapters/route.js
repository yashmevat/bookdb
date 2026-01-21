// app/api/author/chapters/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

// GET - Fetch chapters
export async function GET(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const book_id = searchParams.get('book_id');
    const chapter_id = searchParams.get('chapter_id');

    // If chapter_id is provided, fetch single chapter
    if (chapter_id) {
      const [rows] = await pool.query(
        `SELECT c.*, b.title as book_title, b.id as book_id
         FROM chapters c 
         LEFT JOIN books b ON c.book_id = b.id
         WHERE c.id = ? AND c.author_id = ?`,
        [chapter_id, user.userId]
      );
      return NextResponse.json({ success: true, data: rows });
    }

    // If book_id is provided, fetch all chapters for book
    if (book_id) {
      const [bookCheck] = await pool.query(
        'SELECT id FROM books WHERE id = ? AND author_id = ?',
        [book_id, user.userId]
      );

      if (bookCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Book not found or unauthorized' },
          { status: 403 }
        );
      }

      const [rows] = await pool.query(
        `SELECT c.*, b.title as book_title 
         FROM chapters c 
         LEFT JOIN books b ON c.book_id = b.id
         WHERE c.book_id = ? AND c.author_id = ?
         ORDER BY c.order_num ASC, c.created_at ASC`,
        [book_id, user.userId]
      );
      
      return NextResponse.json({ success: true, data: rows });
    }

    // Otherwise fetch all chapters for author
    const [rows] = await pool.query(
      `SELECT c.*, b.title as book_title 
       FROM chapters c 
       LEFT JOIN books b ON c.book_id = b.id
       WHERE c.author_id = ?
       ORDER BY c.created_at DESC`,
      [user.userId]
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create new chapter
export async function POST(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { title, book_id, order_num } = await request.json();
    
    // Validate required fields
    if (!title || !book_id) {
      return NextResponse.json(
        { success: false, error: 'Title and book_id are required' },
        { status: 400 }
      );
    }

    // Verify book belongs to author
    const [books] = await pool.query(
      'SELECT id FROM books WHERE id = ? AND author_id = ?',
      [book_id, user.userId]
    );

    if (books.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Book not found or unauthorized' },
        { status: 403 }
      );
    }

    // Insert chapter with title, author_id, book_id, order_num
    const [result] = await pool.query(
      'INSERT INTO chapters (title, author_id, book_id, order_num) VALUES (?, ?, ?, ?)',
      [title, user.userId, book_id, order_num || 0]
    );
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        id: result.insertId, 
        title, 
        author_id: user.userId,
        book_id, 
        order_num: order_num || 0
      } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update chapter
export async function PUT(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, title, order_num } = await request.json();
    
    if (!id || !title) {
      return NextResponse.json(
        { success: false, error: 'ID and title are required' },
        { status: 400 }
      );
    }

    // Verify chapter belongs to author
    const [chapterCheck] = await pool.query(
      'SELECT id FROM chapters WHERE id = ? AND author_id = ?',
      [id, user.userId]
    );

    if (chapterCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found or unauthorized' },
        { status: 403 }
      );
    }

    // Update chapter
    await pool.query(
      'UPDATE chapters SET title = ?, order_num = ? WHERE id = ? AND author_id = ?',
      [title, order_num || 0, id, user.userId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete chapter
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
        { success: false, error: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    // Verify chapter belongs to author
    const [chapterCheck] = await pool.query(
      'SELECT id FROM chapters WHERE id = ? AND author_id = ?',
      [id, user.userId]
    );

    if (chapterCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found or unauthorized' },
        { status: 403 }
      );
    }

    // Delete chapter (pages will be deleted automatically due to CASCADE)
    await pool.query(
      'DELETE FROM chapters WHERE id = ? AND author_id = ?', 
      [id, user.userId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
