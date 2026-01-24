// lib/auth.js
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Role constants
export const ROLES = {
  SUPERADMIN: 1,
  AUTHOR: 2,
  USER: 3
};

export function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username, 
      email: user.email, 
      role_id: user.role_id // Changed from role to role_id
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function getUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return null;
    
    const decoded = verifyToken(token);
    if (!decoded) return null;

    // Fetch fresh user data from database with role information
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.role_id, u.created_at, r.role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [decoded.userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0]; // Returns user with role_id and role_name
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// Helper functions for role checking
export function isSuperAdmin(user) {
  return user?.role_id === ROLES.SUPERADMIN;
}

export function isAuthor(user) {
  return user?.role_id === ROLES.AUTHOR;
}

export function isUser(user) {
  return user?.role_id === ROLES.USER;
}

export function hasRole(user, roleId) {
  return user?.role_id === roleId;
}

export function hasAnyRole(user, roleIds) {
  return user && roleIds.includes(user?.role_id);
}
