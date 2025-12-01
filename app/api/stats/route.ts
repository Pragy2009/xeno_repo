import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { email } = await req.json();

  const tenant = await prisma.tenant.findUnique({ where: { email } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const totalOrders = await prisma.order.count({ where: { tenantId: tenant.id } });

  // Calculate Total Revenue
  const orders = await prisma.order.findMany({ where: { tenantId: tenant.id } });
  const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);

  // Get Top 5 Customers [cite: 26]
  const topCustomers = await prisma.customer.findMany({
    where: { tenantId: tenant.id },
    orderBy: { totalSpent: 'desc' },
    take: 5,
    distinct: ['shopifyId'] // Avoid duplicates
  });

  return NextResponse.json({ totalOrders, totalRevenue, topCustomers });
}