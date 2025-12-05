import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import bcrypt from 'bcrypt'; 

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { email, password, shopUrl, accessToken } = await req.json();

  try {
    // 1. Verify Shopify Credentials are Real
    const cleanUrl = shopUrl.replace('https://', '').replace(/\/$/, '');
    try {
      await axios.get(`https://${cleanUrl}/admin/api/2023-10/shop.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      });
    } catch (e) {
      return NextResponse.json({ error: "Invalid Shopify URL or Access Token. Connection failed." }, { status: 400 });
    }

    // 2. Check if User already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // 3. Hash the Password
    const hashedPassword = await bcrypt.hash(password, 10); // <--- 10 rounds of salt

    // 4. Create User with Hashed Password
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // <--- Store the hash, NOT the real password
        shopUrl: cleanUrl,
        accessToken
      }
    });

    return NextResponse.json({ success: true, user: { email: user.email } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}