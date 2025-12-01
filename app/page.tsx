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
  const [errorMsg, setErrorMsg] = useState(''); // New: Store error messages

  const handleSync = async () => {
    setLoading(true);
    setErrorMsg(''); // Clear previous errors
    
    try {
        console.log("Sending data:", { shopUrl, email }); // Debug log
        
        // 1. Trigger Ingestion
        const ingestRes = await axios.post('/api/ingest', { 
            shopUrl: shopUrl.replace('https://', '').replace(/\/$/, ''), // Clean up URL automatically
            accessToken: token, 
            email 
        });

        if (ingestRes.status !== 200) throw new Error("Ingest failed");

        // 2. Fetch Stats
        const statsRes = await axios.post('/api/stats', { email });
        setData(statsRes.data);
    
    } catch (err: any) {
        console.error(err);
        // Show the actual error message on screen
        setErrorMsg(err.response?.data?.error || err.message || "Unknown Error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold text-black mb-8">Xeno FDE Dashboard</h1>

        {/* Config Section */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8 border border-gray-200">
          <h2 className="text-xl font-bold text-black mb-4">1. Connect Store</h2>
          
          {/* Error Alert Box */}
          {errorMsg && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error: </strong> {errorMsg}
            </div>
          )}

          <div className="grid gap-4">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Your Email</label>
                <input 
                    placeholder="e.g. intern@xeno.com" 
                    className="w-full border-2 border-gray-300 p-3 rounded text-black font-medium focus:border-blue-500 focus:outline-none" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Shopify Domain</label>
                <input 
                    placeholder="e.g. teststore-dev.myshopify.com" 
                    className="w-full border-2 border-gray-300 p-3 rounded text-black font-medium focus:border-blue-500 focus:outline-none" 
                    value={shopUrl} 
                    onChange={e => setShopUrl(e.target.value)} 
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Access Token</label>
                <input 
                    placeholder="shpat_xxxxxxxxxxxx" 
                    className="w-full border-2 border-gray-300 p-3 rounded text-black font-medium focus:border-blue-500 focus:outline-none" 
                    type="password" 
                    value={token} 
                    onChange={e => setToken(e.target.value)} 
                />
            </div>

            <button 
              onClick={handleSync} 
              disabled={loading}
              className={`p-3 rounded text-white font-bold text-lg transition-colors ${loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? "Syncing Data... (Please Wait)" : "Ingest Data & Generate Insights"}
            </button>
          </div>
        </div>

        {/* Dashboard Section */}
        {data && (
          <div className="grid gap-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
                <p className="text-gray-600 font-semibold">Total Revenue</p>
                <p className="text-4xl font-bold text-green-700">${data.totalRevenue?.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
                <p className="text-gray-600 font-semibold">Total Orders</p>
                <p className="text-4xl font-bold text-blue-700">{data.totalOrders}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded shadow">
              <h3 className="text-xl font-bold text-black mb-4">Top 5 Customers by Spend</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart data={data.topCustomers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#000" />
                    <YAxis stroke="#000" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
                    <Bar dataKey="totalSpent" fill="#2563eb" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}