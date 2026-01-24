import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

// GET - Fetch pages for a chapter
export async function GET(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role_id !== 2) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chapter_id = searchParams.get('chapter_id');

    if (!chapter_id) {
      return NextResponse.json(
        { success: false, error: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    // Verify chapter belongs to author
    const [chapters] = await pool.query(
      'SELECT id FROM chapters WHERE id = ? AND author_id = ?',
      [chapter_id, user.id]
    );

    if (chapters.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found or unauthorized' },
        { status: 403 }
      );
    }

    // Fetch all pages - sirf id, chapter_id, content
    const [rows] = await pool.query(
      `SELECT id, chapter_id, content, created_at
       FROM pages 
       WHERE chapter_id = ?
       ORDER BY id ASC`,
      [chapter_id]
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

    const { chapter_id, content } = await request.json();
    
    if (!chapter_id) {
      return NextResponse.json(
        { success: false, error: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    // Verify chapter belongs to author
    const [chapters] = await pool.query(
      'SELECT id FROM chapters WHERE id = ? AND author_id = ?',
      [chapter_id, user.id]
    );

    if (chapters.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found or unauthorized' },
        { status: 403 }
      );
    }

    const [result] = await pool.query(
      'INSERT INTO pages (chapter_id, content) VALUES (?, ?)',
      [chapter_id, content || '']
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

    // Verify page belongs to author through chapter
    const [pages] = await pool.query(
      `SELECT p.id FROM pages p
       INNER JOIN chapters c ON p.chapter_id = c.id
       WHERE p.id = ? AND c.author_id = ?`,
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

    // Verify page belongs to author through chapter
    const [pages] = await pool.query(
      `SELECT p.id FROM pages p
       INNER JOIN chapters c ON p.chapter_id = c.id
       WHERE p.id = ? AND c.author_id = ?`,
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
