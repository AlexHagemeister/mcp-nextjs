import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/app/prisma';
import { decrypt } from '@/lib/encryption';
import { HAConnection } from '@/lib/ha-connection';

/**
 * GET /api/ha/test
 * Test Home Assistant connection validity
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { haConfig: true }
    });

    if (!user?.haConfig) {
      return NextResponse.json(
        { error: 'Home Assistant not configured' },
        { status: 404 }
      );
    }

    // Test connection
    const connection = new HAConnection(
      user.haConfig.haUrl,
      decrypt(user.haConfig.haToken)
    );

    try {
      // Connect and get config to verify it works
      await connection.connect();
      const config = await connection.getConfig();
      
      connection.disconnect();

      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        haVersion: config.version,
        haUrl: user.haConfig.haUrl
      });
    } catch (error: any) {
      connection.disconnect();
      
      return NextResponse.json({
        success: false,
        error: error.message || 'Connection failed'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[HA Test API] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

