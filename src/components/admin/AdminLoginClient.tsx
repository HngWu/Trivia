'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/auth/actions';
import AdminLogin from './AdminLogin';

export default function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await adminLogin({ email, password });
      if (!res.success) {
        setError(res.error || 'Login failed');
      } else {
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred during login');
    }
  };

  return (
    <AdminLogin
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      onLogin={handleLogin}
      error={error}
    />
  );
}
