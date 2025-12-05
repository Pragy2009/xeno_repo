"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation'; // For redirecting
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Moon, Sun, Loader2, Database, LayoutDashboard, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  
  // UI State
  const [darkMode, setDarkMode] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Data State
  const [user, setUser] = useState<any>(null); // Store logged in user info
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | ''; msg: string }>({ type: '', msg: '' });

  // 1. Check Authentication on Load
  useEffect(() => {
    const storedUser = localStorage.getItem('xenoUser');
    if (!storedUser) {
        router.push('/login'); // Redirect if not logged in
    } else {
        setUser(JSON.parse(storedUser));
    }
  }, []);

  // Mouse Follow Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSync = async () => {
    if (!user) return;

    setLoading(true);
    setStatus({ type: '', msg: '' });
    
    try {
        // Use credentials from the logged-in User!
        const ingestRes = await axios.post('/api/ingest', { 
            shopUrl: user.shopUrl, 
            accessToken: user.accessToken, 
            email: user.email 
        });

        if (ingestRes.status !== 200) throw new Error("Ingest failed");

        const statsRes = await axios.post('/api/stats', { email: user.email });
        setData(statsRes.data);
        setStatus({ type: 'success', msg: 'Sync Complete!' });
    
    } catch (err: any) {
        console.error(err);
        setStatus({ type: 'error', msg: err.response?.data?.error || err.message || "Connection Failed" });
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('xenoUser');
    router.push('/login');
  };

  // Prevent rendering until user is loaded
  if (!user) return null;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen w-full transition-colors duration-300 ease-in-out bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 overflow-hidden relative">
        
        {/* Interactive Mouse Glow */}
        <div 
          className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(600px at ${mousePos.x}px ${mousePos.y}px, ${darkMode ? 'rgba(29, 78, 216, 0.15)' : 'rgba(59, 130, 246, 0.15)'}, transparent 80%)`
          }}
        />

        {/* Navbar */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-slate-800 backdrop-blur-md bg-white/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-blue-600 rounded-lg">
                <Database className="w-6 h-6 text-white" />
             </div>
             <span className="text-xl font-bold tracking-tight">Xeno<span className="text-blue-600">Intern</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Logged in as: <span className="text-blue-500 font-bold">{user.email}</span></span>
            <button 
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-all"
                title="Logout"
            >
                <LogOut className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition-all border border-transparent dark:border-slate-700"
            >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="relative z-10 max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Actions (No Inputs anymore!) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-gray-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
               <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                 <LayoutDashboard className="w-5 h-5 text-blue-500" />
                 Control Panel
               </h2>
               
               <div className="space-y-4">
                 <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-blue-400 uppercase font-bold mb-1">Connected Store</p>
                    <p className="font-mono text-sm truncate">{user.shopUrl}</p>
                 </div>

                 <button 
                    onClick={handleSync}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sync Now"}
                 </button>

                 {/* Status Messages */}
                 {status.msg && (
                    <div className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2 ${status.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        {status.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                        <span>{status.msg}</span>
                    </div>
                 )}
               </div>
            </div>
          </div>

          {/* Right Column: Dashboard Stats */}
          <div className="lg:col-span-8 space-y-6">
            {!data ? (
                // Empty State Placeholder
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-gray-400 dark:text-slate-600">
                    <Database className="w-16 h-16 mb-4 opacity-20" />
                    <h3 className="text-xl font-bold mb-2">Ready to Sync</h3>
                    <p className="max-w-md">Click "Sync Now" to pull the latest data from {user.shopUrl}.</p>
                </div>
            ) : (
                // Real Data View
                <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden group">
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Revenue</p>
                            <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mt-2">
                                ${data.totalRevenue?.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden group">
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Orders</p>
                            <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 mt-2">
                                {data.totalOrders}
                            </p>
                        </div>
                    </div>

                    {/* Chart Card */}
                    <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <h3 className="text-lg font-bold mb-6">Top Customers by Spend</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topCustomers}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} vertical={false} />
                                    <XAxis dataKey="name" stroke={darkMode ? "#94a3b8" : "#64748b"} tickLine={false} axisLine={false} />
                                    <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#000' }} />
                                    <Bar dataKey="totalSpent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}