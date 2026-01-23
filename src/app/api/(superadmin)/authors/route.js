// app/api/authors/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUser } from '@/lib/auth';
import bcrypt from 'bcrypt';
import { generatePassword, sendWelcomeEmail } from '@/lib/mailer';

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await pool.query(
      "SELECT id, username, email, role, created_at FROM users WHERE role = 'author' ORDER BY created_at DESC"
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { username, email } = await request.json();

    // Check if email already exists
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const [existingUsername] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsername.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Generate random password (12 characters)
    const randomPassword = generatePassword(12);
    console.log('🔑 Generated password for', username, ':', randomPassword);

    // Hash the password
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Insert author into database
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'author']
    );

    console.log('✅ Author created with ID:', result.insertId);

    // Send welcome email with credentials
    console.log('📧 Sending welcome email to:', email);
    const emailResult = await sendWelcomeEmail(email, username, randomPassword);

    if (!emailResult.success) {
      console.error('❌ Failed to send email:', emailResult.error);
      
      // Author is created but email failed
      return NextResponse.json({
        success: true,
        message: `Author created successfully, but failed to send email. Please share these credentials manually:\n\nUsername: ${username}\nPassword: ${randomPassword}`,
        data: { 
          id: result.insertId, 
          username, 
          email, 
          role: 'author',
          tempPassword: randomPassword // Only return if email failed
        },
        emailSent: false,
        warning: 'Email delivery failed. Please note the temporary password above.'
      });
    }

    console.log('✅ Email sent successfully');

    // Success - email sent
    return NextResponse.json({
      success: true,
      message: 'Author created successfully! Login credentials have been sent to their email.',
      data: { 
        id: result.insertId, 
        username, 
        email, 
        role: 'author' 
      },
      emailSent: true
    });

  } catch (error) {
    console.error('❌ Error in POST /api/authors:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Author ID is required' },
        { status: 400 }
      );
    }

    // Check if author exists
    const [author] = await pool.query(
      'SELECT id, username FROM users WHERE id = ? AND role = ?',
      [id, 'author']
    );

    if (author.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Author not found' },
        { status: 404 }
      );
    }

    // Delete the author
    await pool.query('DELETE FROM users WHERE id = ? AND role = ?', [id, 'author']);
    
    console.log('✅ Author deleted:', author[0].username);

    return NextResponse.json({ 
      success: true, 
      message: 'Author deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Error in DELETE /api/authors:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
