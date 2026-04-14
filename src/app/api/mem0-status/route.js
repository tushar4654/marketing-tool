import { getMem0Client } from '@/lib/mem0';
import { NextResponse } from 'next/server';

export async function GET() {
  const mem0 = getMem0Client();
  if (!mem0) {
    return NextResponse.json({
      connected: false,
      message: 'MEM0_API_KEY not configured. Add it to your .env file.',
    });
  }

  try {
    await mem0.search('test', { user_id: 'health_check', limit: 1 });
    return NextResponse.json({
      connected: true,
      message: 'Mem0 is connected and operational.',
    });
  } catch (err) {
    return NextResponse.json({
      connected: false,
      message: `Mem0 connection failed: ${err.message}`,
    });
  }
}
