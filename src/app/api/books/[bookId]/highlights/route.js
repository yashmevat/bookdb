import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

// GET - Fetch all highlights for a book (for current user)
export async function GET(req, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;

    const [highlights] = await pool.query(
      `SELECT id, book_id, user_id, title, page_index, selected_text, color, created_at 
       FROM highlights 
       WHERE book_id = ? AND user_id = ? 
       ORDER BY page_index ASC, created_at ASC`,
      [bookId, user.id]
    );

    return NextResponse.json({
      success: true,
      data: highlights
    });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch highlights' },
      { status: 500 }
    );
  }
}

// POST - Create a new highlight
export async function POST(req, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;
    const body = await req.json();
    const { title, page_index, selected_text, color } = body;

    // Validation
    if (!title || page_index === undefined || !selected_text || !color) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      `INSERT INTO highlights (book_id, user_id, title, page_index, selected_text, color) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bookId, user.id, title, page_index, selected_text, color]
    );

    const [newHighlight] = await pool.query(
      `SELECT id, book_id, user_id, title, page_index, selected_text, color, created_at 
       FROM highlights 
       WHERE id = ?`,
      [result.insertId]
    );

    return NextResponse.json({
      success: true,
      data: newHighlight[0],
      message: 'Highlight created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating highlight:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create highlight' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific highlight
export async function DELETE(req, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;
    const { searchParams } = new URL(req.url);
    const highlightId = searchParams.get('id');

    if (!highlightId) {
      return NextResponse.json(
        { success: false, message: 'Highlight ID is required' },
        { status: 400 }
      );
    }

    // Verify the highlight belongs to the user and book
    const [result] = await pool.query(
      `DELETE FROM highlights 
       WHERE id = ? AND book_id = ? AND user_id = ?`,
      [highlightId, bookId, user.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Highlight not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Highlight deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete highlight' },
      { status: 500 }
    );
  }
}
