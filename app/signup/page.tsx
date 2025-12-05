"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', shopUrl: '', accessToken: '' });
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/signup', form);
      alert("Account Created! Please Login.");
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Create Account</h1>
        <p className="text-slate-500 text-sm text-center mb-6">Connect your Shopify Store securely</p>
        
        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}

        <div className="space-y-3">
          <input 
            placeholder="Email"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white"
            onChange={e => setForm({...form, email: e.target.value})}
          />
          <input 
            type="password"
            placeholder="Password"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white"
            onChange={e => setForm({...form, password: e.target.value})}
          />
          <input 
            placeholder="Shopify Domain (store.myshopify.com)"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white"
            onChange={e => setForm({...form, shopUrl: e.target.value})}
          />
          <input 
            type="password"
            placeholder="Shopify Access Token (shpat_...)"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white"
            onChange={e => setForm({...form, accessToken: e.target.value})}
          />

          <button 
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded transition-all flex justify-center mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Verify & Register"}
          </button>
        </div>
        <p className="text-slate-500 text-center mt-6 text-sm">
          Have an account? <a href="/login" className="text-blue-400 hover:underline">Login</a>
        </p>
      </div>
    </div>
  );
}