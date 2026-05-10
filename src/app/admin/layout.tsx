'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminLogin from '@/components/admin/AdminLogin';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };
    checkUser();
  }, [supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const { data, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
    if (loginErr) {
      setError(loginErr.message);
    } else {
      setUser(data.user);
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  };

  if (isLoading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-bold tracking-widest animate-pulse">Establishing Command...</div>;

  if (!user) return <AdminLogin email={email} setEmail={setEmail} password={password} setPassword={setPassword} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col page-transition selection:bg-white/20">
      <header className="glass sticky top-0 z-50 px-6 sm:px-12 py-3 sm:py-4 flex justify-between items-center border-x-0 border-t-0 rounded-none backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-gray-500 hover:text-white transition-all transform hover:scale-110">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">Admin Panel</h1>
            <span className="text-[9px] font-bold tracking-widest text-gray-600 uppercase">Trivia Control</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-4">
          <Link 
            href="/admin/topics" 
            className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all ${pathname === '/admin/topics' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
          >
            Topics
          </Link>
          <Link 
            href="/admin/questions" 
            className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all ${pathname === '/admin/questions' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
          >
            Questions
          </Link>
        </nav>

        <button 
          onClick={handleSignOut}
          className="px-4 py-2 glass-button rounded-xl text-[10px] font-bold tracking-wider border-white/5 hover:text-red-500 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-8 md:p-12 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <footer className="p-8 text-center text-gray-800 text-[10px] font-bold tracking-[1em] opacity-30 pointer-events-none">
        TriviaDuel Admin • v4.2-GLASS
      </footer>
    </div>
  );
}
