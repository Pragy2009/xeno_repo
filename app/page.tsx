"use client";
import { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [email, setEmail] = useState('');
  const [shopUrl, setShopUrl] = useState('');
  const [token, setToken] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    // Call Ingest API
    await axios.post('/api/ingest', { shopUrl, accessToken: token, email });
    // After sync, fetch stats
    const stats = await axios.post('/api/stats', { email });
    setData(stats.data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Xeno FDE Dashboard</h1>

        {/* Config Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Connect Store</h2>
          <div className="grid gap-4">
            <input placeholder="Your Email (Tenant ID)" className="border p-2 rounded" value={email} onChange={e => setEmail(e.target.value)} />
            <input placeholder="shop-name.myshopify.com" className="border p-2 rounded" value={shopUrl} onChange={e => setShopUrl(e.target.value)} />
            <input placeholder="Shopify Access Token (shpat_...)" className="border p-2 rounded" type="password" value={token} onChange={e => setToken(e.target.value)} />
            <button 
              onClick={handleSync} 
              disabled={loading}
              className="bg-black text-white p-3 rounded hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Syncing Data..." : "Ingest Data & Generate Insights"}
            </button>
          </div>
        </div>

        {/* Dashboard Section */}
        {data && (
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded shadow">
                <p className="text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">${data.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded shadow">
                <p className="text-gray-500">Total Orders</p>
                <p className="text-3xl font-bold text-blue-600">{data.totalOrders}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded shadow">
              <h3 className="text-lg font-bold mb-4">Top 5 Customers by Spend [cite: 26]</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topCustomers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalSpent" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}