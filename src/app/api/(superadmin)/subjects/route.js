// app/api/subjects/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';

const ROLE_SUPERADMIN = 1;
const ROLE_AUTHOR = 2;

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await pool.query(
      `SELECT s.*, u.username as created_by_username 
       FROM subjects s
       LEFT JOIN users u ON u.id = s.created_by
       ORDER BY s.created_at DESC`
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    
    // Check if user is authenticated
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (superadmin or author)
    if (user.role_id !== ROLE_SUPERADMIN && user.role_id !== ROLE_AUTHOR) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { name, description } = await request.json();

    // Validate input
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Subject name is required' },
        { status: 400 }
      );
    }

    // Check if subject already exists
    const [existingSubject] = await pool.query(
      'SELECT id FROM subjects WHERE name = ?',
      [name]
    );

    if (existingSubject.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Subject already exists' },
        { status: 400 }
      );
    }

    // Insert subject with created_by field
    const [result] = await pool.query(
      'INSERT INTO subjects (name, description, created_by) VALUES (?, ?, ?)',
      [name, description || null, user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Subject created successfully',
      data: {
        id: result.insertId,
        name,
        description,
        created_by: user.id,
        created_by_username: user.username
      }
    });

  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getUser();
    
    if (!user || user.role_id !== ROLE_SUPERADMIN) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM subjects WHERE id = ?', [id]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Subject deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
