import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // <--- Import bcrypt

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { email, password } = await req.json();

  try {
    // 1. Find User
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // 2. Compare Password with Hash
    const passwordMatch = await bcrypt.compare(password, user.password); // <--- Magic check

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // 3. Success! Return User Data (Exclude password)
    return NextResponse.json({ 
        success: true, 
        user: { 
            email: user.email, 
            shopUrl: user.shopUrl, 
            accessToken: user.accessToken 
        } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}