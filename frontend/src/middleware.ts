import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

const TRACKED_FILES: Record<string, string> = {
  '/fiche-memo.pdf': 'fiche-memo.pdf',
};

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (TRACKED_FILES[pathname]) {
    const filename = TRACKED_FILES[pathname];
    const source = searchParams.get('source') || 'direct';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '';
    const token = request.cookies.get('access_token')?.value;

    // Fire-and-forget — ne bloque pas la réponse
    fetch(`${API_URL}/download/track/${filename}?source=${source}`, {
      method: 'GET',
      headers: {
        'x-forwarded-for': ip,
        ...(token ? { 'x-auth-token': token } : {}),
      },
    }).catch(() => {});
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/fiche-memo.pdf'],
};
