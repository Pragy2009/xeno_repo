"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', form);
      // Save user to localStorage (Simple Session)
      localStorage.setItem('xenoUser', JSON.stringify(res.data.user));
      router.push('/'); // Go to Dashboard
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Welcome Back</h1>
        
        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase">Email</label>
            <input 
              type="email"
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white mt-1"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase">Password</label>
            <input 
              type="password"
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white mt-1"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
            />
          </div>
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-all flex justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Login"}
          </button>
        </div>
        <p className="text-slate-500 text-center mt-6 text-sm">
          No account? <a href="/signup" className="text-blue-400 hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}