import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

// GET - Fetch all bookmarks for a book (for current user)
export async function GET(req, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;

    const [bookmarks] = await pool.query(
      `SELECT id, user_id, book_id, page_index, created_at 
       FROM bookmarks 
       WHERE book_id = ? AND user_id = ? 
       ORDER BY page_index ASC`,
      [bookId, user.id]
    );

    return NextResponse.json({
      success: true,
      data: bookmarks
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch bookmarks' },
      { status: 500 }
    );
  }
}

// POST - Create a new bookmark (or toggle if exists)
export async function POST(req, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;
    const body = await req.json();
    const { page_index } = body;

    // Validation
    if (page_index === undefined) {
      return NextResponse.json(
        { success: false, message: 'Page index is required' },
        { status: 400 }
      );
    }

    // Check if bookmark already exists
    const [existing] = await pool.query(
      `SELECT id FROM bookmarks 
       WHERE book_id = ? AND user_id = ? AND page_index = ?`,
      [bookId, user.id, page_index]
    );

    if (existing.length > 0) {
      // Bookmark exists, delete it (toggle off)
      await pool.query(
        `DELETE FROM bookmarks WHERE id = ?`,
        [existing[0].id]
      );

      return NextResponse.json({
        success: true,
        action: 'removed',
        message: 'Bookmark removed successfully'
      });
    } else {
      // Create new bookmark
      const [result] = await pool.query(
        `INSERT INTO bookmarks (book_id, user_id, page_index) 
         VALUES (?, ?, ?)`,
        [bookId, user.id, page_index]
      );

      const [newBookmark] = await pool.query(
        `SELECT id, user_id, book_id, page_index, created_at 
         FROM bookmarks 
         WHERE id = ?`,
        [result.insertId]
      );

      return NextResponse.json({
        success: true,
        action: 'added',
        data: newBookmark[0],
        message: 'Bookmark added successfully'
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to toggle bookmark' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific bookmark
export async function DELETE(req, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;
    const { searchParams } = new URL(req.url);
    const bookmarkId = searchParams.get('id');

    if (!bookmarkId) {
      return NextResponse.json(
        { success: false, message: 'Bookmark ID is required' },
        { status: 400 }
      );
    }

    // Verify the bookmark belongs to the user and book
    const [result] = await pool.query(
      `DELETE FROM bookmarks 
       WHERE id = ? AND book_id = ? AND user_id = ?`,
      [bookmarkId, bookId, user.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Bookmark not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bookmark deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
}
