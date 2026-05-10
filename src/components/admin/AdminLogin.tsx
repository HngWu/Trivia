import React from 'react';

interface AdminLoginProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  onLogin: (e: React.FormEvent) => void;
  error: string | null;
}

export default function AdminLogin({ email, setEmail, password, setPassword, onLogin, error }: AdminLoginProps) {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 page-transition">
      <div className="glass p-8 sm:p-12 rounded-[2rem] w-full max-w-md space-y-6 border-white/10 shadow-xl">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Admin login</h1>
          <p className="text-gray-500 font-medium text-xs">Enter credentials to manage game settings</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={onLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 glass-input rounded-xl px-4 font-medium text-foreground" 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 glass-input rounded-xl px-4 font-medium text-foreground" 
          />
          <button type="submit" className="w-full h-11 glass-button bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all">Sign in</button>
        </form>
        <button onClick={() => window.location.href = "/"} className="w-full text-[10px] font-bold tracking-widest text-gray-700 hover:text-foreground transition-colors uppercase">Back to home</button>
      </div>
    </main>
  );
}
