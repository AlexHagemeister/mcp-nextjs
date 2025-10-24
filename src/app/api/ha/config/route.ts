import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/app/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

/**
 * GET /api/ha/config
 * Get current Home Assistant configuration (token masked)
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

    // Return config with masked token
    return NextResponse.json({
      haUrl: user.haConfig.haUrl,
      hasToken: true,
      tokenPreview: '***...' + decrypt(user.haConfig.haToken).slice(-4),
      createdAt: user.haConfig.createdAt,
      updatedAt: user.haConfig.updatedAt
    });
  } catch (error) {
    console.error('[HA Config API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ha/config
 * Add or update Home Assistant configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { haUrl, haToken } = body;

    // Validate input
    if (!haUrl || !haToken) {
      return NextResponse.json(
        { error: 'haUrl and haToken are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(haUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid haUrl format' },
        { status: 400 }
      );
    }

    // Encrypt the token
    const encryptedToken = encrypt(haToken);

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Upsert HA config
    const haConfig = await prisma.homeAssistantConfig.upsert({
      where: { userId: user.id },
      update: {
        haUrl,
        haToken: encryptedToken
      },
      create: {
        userId: user.id,
        haUrl,
        haToken: encryptedToken
      }
    });

    return NextResponse.json({
      message: 'Home Assistant configuration saved',
      haUrl: haConfig.haUrl,
      createdAt: haConfig.createdAt,
      updatedAt: haConfig.updatedAt
    });
  } catch (error) {
    console.error('[HA Config API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ha/config
 * Remove Home Assistant configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete HA config if it exists
    await prisma.homeAssistantConfig.deleteMany({
      where: { userId: user.id }
    });

    return NextResponse.json({
      message: 'Home Assistant configuration removed'
    });
  } catch (error) {
    console.error('[HA Config API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

