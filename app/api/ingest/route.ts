import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { shopUrl, accessToken, email } = await req.json();

  try {
    // 1. Create Tenant (User)
    const tenant = await prisma.tenant.upsert({
      where: { email: email },
      update: {},
      create: { name: shopUrl, email: email }
    });

    // 2. Fetch Orders from Shopify
    const response = await axios.get(`https://${shopUrl}/admin/api/2023-10/orders.json?status=any`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const orders = response.data.orders;

    // 3. Save Data to DB
    for (const order of orders) {
      // Save Order
      await prisma.order.create({
        data: {
          shopifyId: String(order.id),
          amount: parseFloat(order.total_price),
          date: new Date(order.created_at),
          tenantId: tenant.id
        }
      });

      // Save Customer (if exists)
      if (order.customer) {
        await prisma.customer.create({
          data: {
            shopifyId: String(order.customer.id),
            name: `${order.customer.first_name} ${order.customer.last_name}`,
            totalSpent: parseFloat(order.customer.total_spent || '0'),
            tenantId: tenant.id
          }
        });
      }
    }

    return NextResponse.json({ success: true, message: `Synced ${orders.length} orders!` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}