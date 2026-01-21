// app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
