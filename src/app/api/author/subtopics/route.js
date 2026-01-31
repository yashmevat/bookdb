// app/api/author/subtopics/route.js
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import pool from '@/lib/db';

// GET - Fetch subtopics for a specific topic
export async function GET(req) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const authorId = decoded.userId;

    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('book_id');
    const topicId = searchParams.get('topic_id');

    if (!bookId || !topicId) {
      return NextResponse.json({ 
        success: false, 
        error: 'book_id and topic_id are required' 
      }, { status: 400 });
    }

    // Verify book belongs to author
    const [books] = await pool.query(
      'SELECT id, title FROM books WHERE id = ? AND author_id = ?',
      [bookId, authorId]
    );

    if (books.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Book not found or unauthorized' 
      }, { status: 404 });
    }

    // Get topic details
    const [topics] = await pool.query(
      'SELECT id, name, description FROM topics WHERE id = ? AND book_id = ?',
      [topicId, bookId]
    );

    if (topics.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Topic not found' 
      }, { status: 404 });
    }

    // Get subtopics
    const [subtopics] = await pool.query(`
      SELECT 
        id,
        name,
        description,
        created_at,
        updated_at
      FROM subtopics
      WHERE book_id = ? AND topic_id = ? AND author_id = ?
      ORDER BY created_at ASC
    `, [bookId, topicId, authorId]);

    return NextResponse.json({
      success: true,
      book: books[0],
      topic: topics[0],
      subtopics
    });

  } catch (error) {
    console.error('Error fetching subtopics:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch subtopics' 
    }, { status: 500 });
  }
}

// POST - Create a new subtopic
export async function POST(req) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const authorId = decoded.userId;

    const { name, description, book_id, topic_id } = await req.json();

    // Validation
    if (!name || !book_id || !topic_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Name, book_id, and topic_id are required' 
      }, { status: 400 });
    }

    // Verify book belongs to author
    const [books] = await pool.query(
      'SELECT id FROM books WHERE id = ? AND author_id = ?',
      [book_id, authorId]
    );

    if (books.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Book not found or unauthorized' 
      }, { status: 404 });
    }

    // Verify topic belongs to book
    const [topics] = await pool.query(
      'SELECT id FROM topics WHERE id = ? AND book_id = ?',
      [topic_id, book_id]
    );

    if (topics.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Topic not found' 
      }, { status: 404 });
    }

    // Insert subtopic with author_id
    const [result] = await pool.query(
      'INSERT INTO subtopics (name, description, topic_id, book_id, author_id) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), description?.trim() || null, topic_id, book_id, authorId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Subtopic created successfully',
      id: result.insertId 
    });

  } catch (error) {
    console.error('Error creating subtopic:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create subtopic' 
    }, { status: 500 });
  }
}

// PUT - Update an existing subtopic
export async function PUT(req) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const authorId = decoded.userId;

    const { id, name, description } = await req.json();

    // Validation
    if (!id || !name) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID and name are required' 
      }, { status: 400 });
    }

    // Update subtopic (only if it belongs to the author)
    const [result] = await pool.query(
      'UPDATE subtopics SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND author_id = ?',
      [name.trim(), description?.trim() || null, id, authorId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Subtopic not found or unauthorized' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subtopic updated successfully' 
    });

  } catch (error) {
    console.error('Error updating subtopic:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update subtopic' 
    }, { status: 500 });
  }
}

// DELETE - Delete a subtopic
export async function DELETE(req) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const authorId = decoded.userId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Subtopic ID is required' 
      }, { status: 400 });
    }

    // Delete subtopic (only if it belongs to the author)
    const [result] = await pool.query(
      'DELETE FROM subtopics WHERE id = ? AND author_id = ?',
      [id, authorId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Subtopic not found or unauthorized' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subtopic deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting subtopic:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete subtopic' 
    }, { status: 500 });
  }
}
