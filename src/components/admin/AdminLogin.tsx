import React from 'react';
import { Button, Input, Card, Alert, TextField, Label } from "@heroui/react";

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
      <Card className="glass p-8 sm:p-12 rounded-[2rem] w-full max-w-md space-y-6 border-white/10 shadow-xl bg-transparent">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Admin login</h1>
          <p className="text-gray-500 font-medium text-xs">Enter credentials to manage game settings</p>
        </div>

        {error && (
          <Alert 
            status="danger" 
            className="bg-red-500/10 border-red-500/20"
          >
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Authentication Error</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <form onSubmit={onLogin} className="space-y-4">
          <TextField name="email" type="email" value={email} onChange={setEmail}>
            <Label className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1 ml-1">Email</Label>
            <Input 
              placeholder="Enter your email" 
              className="glass !border-white/10 h-12 rounded-xl px-4 font-medium"
            />
          </TextField>
          <TextField name="password" type="password" value={password} onChange={setPassword}>
            <Label className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1 ml-1">Password</Label>
            <Input 
              placeholder="Enter your password" 
              className="glass !border-white/10 h-12 rounded-xl px-4 font-medium"
            />
          </TextField>
          <Button 
            type="submit" 
            className="w-full h-12 bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all text-base"
          >
            Sign in
          </Button>
        </form>
        <Button 
          variant="tertiary"
          onPress={() => window.location.href = "/"} 
          className="w-full text-[10px] font-bold tracking-widest text-gray-700 hover:text-foreground transition-colors uppercase h-auto min-w-0 p-0"
        >
          Back to home
        </Button>
      </Card>
    </main>
  );
}
