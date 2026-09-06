'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminLogout } from '@/lib/auth/actions';
import DatabaseToggle from '@/components/admin/DatabaseToggle';
import ChangePasswordModal from '@/components/admin/ChangePasswordModal';
import Toast from '@/components/shared/Toast';

interface AdminLayoutClientProps {
  user: { id: string; email: string };
  children: React.ReactNode;
}

export default function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const pathname = usePathname();

  const handleSignOut = async () => {
    await adminLogout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col page-transition selection:bg-white/20">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={(msg) => setToast(msg)}
      />

      <header className="glass sticky top-0 z-50 px-4 sm:px-12 py-3 sm:py-4 flex justify-between items-center border-x-0 border-t-0 rounded-none backdrop-blur-3xl shadow-2xl gap-4 flex-wrap">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-gray-500 hover:text-white transition-all transform hover:scale-110">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div className="flex flex-col">
            <Link href="/admin">
              <h1 className="text-xl font-bold tracking-tight text-foreground leading-none hover:text-white transition-colors">Admin Panel</h1>
            </Link>
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
          <Link 
            href="/admin/users" 
            className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all ${pathname === '/admin/users' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
          >
            Users
          </Link>
        </nav>

        <div className="flex items-center space-x-3">
          <DatabaseToggle onStatusChange={(msg) => setToast(msg)} />

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-3 py-1.5 glass-button rounded-xl text-[10px] font-bold tracking-wider border-white/5 hover:text-white transition-colors text-gray-400"
            title="Change Admin Password"
          >
            Password
          </button>

          <button 
            onClick={handleSignOut}
            className="px-3 py-1.5 glass-button rounded-xl text-[10px] font-bold tracking-wider border-white/5 hover:text-red-500 transition-colors text-gray-400"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 md:p-12 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <footer className="p-8 text-center text-gray-800 text-[10px] font-bold tracking-[1em] opacity-30 pointer-events-none">
        TriviaDuel Admin • Local SQLite & Cloud Switch
      </footer>
    </div>
  );
}
