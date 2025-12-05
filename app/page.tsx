// "use client";
// import { useState } from 'react';
// import axios from 'axios';
// import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

// export default function Home() {
//   const [email, setEmail] = useState('');
//   const [shopUrl, setShopUrl] = useState('');
//   const [token, setToken] = useState('');
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState(''); // New: Store error messages

//   const handleSync = async () => {
//     setLoading(true);
//     setErrorMsg(''); // Clear previous errors
    
//     try {
//         console.log("Sending data:", { shopUrl, email }); // Debug log
        
//         // 1. Trigger Ingestion
//         const ingestRes = await axios.post('/api/ingest', { 
//             shopUrl: shopUrl.replace('https://', '').replace(/\/$/, ''), // Clean up URL automatically
//             accessToken: token, 
//             email 
//         });

//         if (ingestRes.status !== 200) throw new Error("Ingest failed");

//         // 2. Fetch Stats
//         const statsRes = await axios.post('/api/stats', { email });
//         setData(statsRes.data);
    
//     } catch (err: any) {
//         console.error(err);
//         // Show the actual error message on screen
//         setErrorMsg(err.response?.data?.error || err.message || "Unknown Error");
//     } finally {
//         setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-900">
//       <div className="max-w-4xl mx-auto">
//         <h1 className="text-4xl font-extrabold text-black mb-8">Xeno FDE Dashboard</h1>

//         {/* Config Section */}
//         <div className="bg-white p-6 rounded-lg shadow-lg mb-8 border border-gray-200">
//           <h2 className="text-xl font-bold text-black mb-4">1. Connect Store</h2>
          
//           {/* Error Alert Box */}
//           {errorMsg && (
//             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//               <strong>Error: </strong> {errorMsg}
//             </div>
//           )}

//           <div className="grid gap-4">
//             <div>
//                 <label className="block text-sm font-bold text-gray-700 mb-1">Your Email</label>
//                 <input 
//                     placeholder="e.g. intern@xeno.com" 
//                     className="w-full border-2 border-gray-300 p-3 rounded text-black font-medium focus:border-blue-500 focus:outline-none" 
//                     value={email} 
//                     onChange={e => setEmail(e.target.value)} 
//                 />
//             </div>

//             <div>
//                 <label className="block text-sm font-bold text-gray-700 mb-1">Shopify Domain</label>
//                 <input 
//                     placeholder="e.g. teststore-dev.myshopify.com" 
//                     className="w-full border-2 border-gray-300 p-3 rounded text-black font-medium focus:border-blue-500 focus:outline-none" 
//                     value={shopUrl} 
//                     onChange={e => setShopUrl(e.target.value)} 
//                 />
//             </div>

//             <div>
//                 <label className="block text-sm font-bold text-gray-700 mb-1">Access Token</label>
//                 <input 
//                     placeholder="shpat_xxxxxxxxxxxx" 
//                     className="w-full border-2 border-gray-300 p-3 rounded text-black font-medium focus:border-blue-500 focus:outline-none" 
//                     type="password" 
//                     value={token} 
//                     onChange={e => setToken(e.target.value)} 
//                 />
//             </div>

//             <button 
//               onClick={handleSync} 
//               disabled={loading}
//               className={`p-3 rounded text-white font-bold text-lg transition-colors ${loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
//               {loading ? "Syncing Data... (Please Wait)" : "Ingest Data & Generate Insights"}
//             </button>
//           </div>
//         </div>

//         {/* Dashboard Section */}
//         {data && (
//           <div className="grid gap-6 animate-fade-in">
//             <div className="grid grid-cols-2 gap-4">
//               <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
//                 <p className="text-gray-600 font-semibold">Total Revenue</p>
//                 <p className="text-4xl font-bold text-green-700">${data.totalRevenue?.toFixed(2)}</p>
//               </div>
//               <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
//                 <p className="text-gray-600 font-semibold">Total Orders</p>
//                 <p className="text-4xl font-bold text-blue-700">{data.totalOrders}</p>
//               </div>
//             </div>

//             <div className="bg-white p-6 rounded shadow">
//               <h3 className="text-xl font-bold text-black mb-4">Top 5 Customers by Spend</h3>
//               <div style={{ width: '100%', height: 300 }}>
//                 <ResponsiveContainer>
//                     <BarChart data={data.topCustomers}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="name" stroke="#000" />
//                     <YAxis stroke="#000" />
//                     <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
//                     <Bar dataKey="totalSpent" fill="#2563eb" />
//                     </BarChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Moon, Sun, Loader2, Database, LayoutDashboard, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  // UI State
  const [darkMode, setDarkMode] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Data State
  const [email, setEmail] = useState('');
  const [shopUrl, setShopUrl] = useState('');
  const [token, setToken] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | ''; msg: string }>({ type: '', msg: '' });

  // Mouse Follow Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSync = async () => {
    setLoading(true);
    setStatus({ type: '', msg: '' });
    
    try {
        // 1. Ingest Data
        const ingestRes = await axios.post('/api/ingest', { 
            shopUrl: shopUrl.replace('https://', '').replace(/\/$/, ''), 
            accessToken: token, 
            email 
        });

        if (ingestRes.status !== 200) throw new Error("Ingest failed");

        // 2. Fetch Stats
        // Note: Ensure you have src/app/api/stats/route.ts created from Phase 3!
        // If you skipped that, this part will fail. 
        const statsRes = await axios.post('/api/stats', { email });
        
        setData(statsRes.data);
        setStatus({ type: 'success', msg: 'Sync Complete! Database updated.' });
    
    } catch (err: any) {
        console.error(err);
        setStatus({ type: 'error', msg: err.response?.data?.error || err.message || "Connection Failed" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen w-full transition-colors duration-300 ease-in-out bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 overflow-hidden relative">
        
        {/* Interactive Mouse Glow (Spotlight) */}
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
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition-all border border-transparent dark:border-slate-700"
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
        </nav>

        {/* Main Content */}
        <main className="relative z-10 max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Configuration */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-gray-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
               <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                 <LayoutDashboard className="w-5 h-5 text-blue-500" />
                 Connect Store
               </h2>
               
               <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Tenant Email</label>
                    <input 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@xeno.com"
                      className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Shopify Domain</label>
                    <input 
                      value={shopUrl}
                      onChange={e => setShopUrl(e.target.value)}
                      placeholder="store.myshopify.com"
                      className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                 </div>

                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Access Token</label>
                    <input 
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="shpat_xxxxxxxx"
                      className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                 </div>

                 <button 
                    onClick={handleSync}
                    disabled={loading}
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Ingestion"}
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
                    <h3 className="text-xl font-bold mb-2">No Data Visualized Yet</h3>
                    <p className="max-w-md">Connect your Shopify store using the panel on the left to ingest data and generate real-time insights.</p>
                </div>
            ) : (
                // Real Data View with Animation
                <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <span className="text-6xl font-bold text-green-500">$</span>
                            </div>
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Revenue</p>
                            <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mt-2">
                                ${data.totalRevenue?.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <span className="text-6xl font-bold text-blue-500">#</span>
                            </div>
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Orders</p>
                            <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 mt-2">
                                {data.totalOrders}
                            </p>
                        </div>
                    </div>

                    {/* Chart Card */}
                    <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            Top Customers by Spend
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topCustomers}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke={darkMode ? "#94a3b8" : "#64748b"} 
                                        tick={{fontSize: 12}}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis 
                                        stroke={darkMode ? "#94a3b8" : "#64748b"} 
                                        tick={{fontSize: 12}}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: darkMode ? '#1e293b' : '#fff', 
                                            borderColor: darkMode ? '#334155' : '#e2e8f0',
                                            borderRadius: '8px',
                                            color: darkMode ? '#fff' : '#000'
                                        }} 
                                    />
                                    <Bar 
                                        dataKey="totalSpent" 
                                        fill="url(#colorGradient)" 
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1500}
                                    >
                                        {/* Define gradient for bars */}
                                        <defs>
                                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            </linearGradient>
                                        </defs>
                                    </Bar>
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