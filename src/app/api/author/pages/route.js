// app/api/author/pages/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

// GET - Fetch pages for a subtopic
export async function GET(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role_id !== 2) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subtopic_id = searchParams.get('subtopic_id');

    if (!subtopic_id) {
      return NextResponse.json(
        { success: false, error: 'Subtopic ID is required' },
        { status: 400 }
      );
    }

    // Verify subtopic belongs to author
    const [subtopics] = await pool.query(
      'SELECT id FROM subtopics WHERE id = ? AND author_id = ?',
      [subtopic_id, user.id]
    );

    if (subtopics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subtopic not found or unauthorized' },
        { status: 403 }
      );
    }

    // Fetch all pages for the subtopic
    const [rows] = await pool.query(
      `SELECT id, subtopic_id, content, created_at
       FROM pages 
       WHERE subtopic_id = ?
       ORDER BY id ASC`,
      [subtopic_id]
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Pages GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create new page
export async function POST(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role_id !== 2) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { subtopic_id, content } = await request.json();
    
    if (!subtopic_id) {
      return NextResponse.json(
        { success: false, error: 'Subtopic ID is required' },
        { status: 400 }
      );
    }

    // Verify subtopic belongs to author
    const [subtopics] = await pool.query(
      'SELECT id FROM subtopics WHERE id = ? AND author_id = ?',
      [subtopic_id, user.id]
    );

    if (subtopics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subtopic not found or unauthorized' },
        { status: 403 }
      );
    }

    const [result] = await pool.query(
      'INSERT INTO pages (subtopic_id, content) VALUES (?, ?)',
      [subtopic_id, content || '']
    );
    
    return NextResponse.json({ 
      success: true, 
      data: { id: result.insertId } 
    });
  } catch (error) {
    console.error('Pages POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update page
export async function PUT(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role_id !== 2) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, content } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // Verify page belongs to author through subtopic
    const [pages] = await pool.query(
      `SELECT p.id FROM pages p
       INNER JOIN subtopics st ON p.subtopic_id = st.id
       WHERE p.id = ? AND st.author_id = ?`,
      [id, user.id]
    );

    if (pages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Page not found or unauthorized' },
        { status: 403 }
      );
    }

    await pool.query(
      'UPDATE pages SET content = ? WHERE id = ?',
      [content || '', id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pages PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete page
export async function DELETE(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role_id !== 2) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // Verify page belongs to author through subtopic
    const [pages] = await pool.query(
      `SELECT p.id FROM pages p
       INNER JOIN subtopics st ON p.subtopic_id = st.id
       WHERE p.id = ? AND st.author_id = ?`,
      [id, user.id]
    );

    if (pages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Page not found or unauthorized' },
        { status: 403 }
      );
    }

    await pool.query('DELETE FROM pages WHERE id = ?', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pages DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
