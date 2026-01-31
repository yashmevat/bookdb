// app/api/author/books/route.js
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(req) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const authorId = decoded.userId;

    const { title, subject_id, topics } = await req.json();

    if (!title || !subject_id || !topics || topics.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title, subject, and at least one topic are required' 
      }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insert book
      const [bookResult] = await connection.query(
        'INSERT INTO books (title, author_id, subject_id) VALUES (?, ?, ?)',
        [title, authorId, subject_id]
      );

      const bookId = bookResult.insertId;

      // Insert all topics
      for (const topic of topics) {
        if (topic.name && topic.name.trim()) {
          await connection.query(
            'INSERT INTO topics (name, book_id, subject_id) VALUES (?, ?, ?)',
            [topic.name.trim(), bookId, subject_id]
          );
        }
      }

      await connection.commit();

      return NextResponse.json({ 
        success: true, 
        message: 'Book and topics created successfully',
        bookId 
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create book' 
    }, { status: 500 });
  }
}

// app/api/author/books/route.js - Update the GET method
export async function GET(req) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const authorId = decoded.userId;

    // Get books with their topics
    const [books] = await pool.query(`
      SELECT 
        b.id,
        b.title,
        b.subject_id,
        b.created_at,
        s.name as subject_name
      FROM books b
      JOIN subjects s ON b.subject_id = s.id
      WHERE b.author_id = ?
      ORDER BY b.created_at DESC
    `, [authorId]);

    // Get topics for each book with subtopic count
    for (let book of books) {
      const [topics] = await pool.query(`
        SELECT 
          t.id, 
          t.name,
          COUNT(st.id) as subtopic_count
        FROM topics t
        LEFT JOIN subtopics st ON t.id = st.topic_id
        WHERE t.book_id = ?
        GROUP BY t.id
        ORDER BY t.created_at ASC
      `, [book.id]);
      
      book.topics = topics;
    }

    return NextResponse.json({ success: true, data: books });

  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch books' 
    }, { status: 500 });
  }
}


export async function DELETE(req) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const authorId = decoded.userId;

    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('id');

    if (!bookId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Book ID required' 
      }, { status: 400 });
    }

    // Delete book (topics will be deleted by CASCADE)
    const [result] = await pool.query(
      'DELETE FROM books WHERE id = ? AND author_id = ?',
      [bookId, authorId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Book not found or unauthorized' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Book deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete book' 
    }, { status: 500 });
  }
}
