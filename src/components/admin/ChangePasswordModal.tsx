'use client';

import React, { useState } from 'react';
import { changeAdminPassword } from '@/lib/auth/actions';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const res = await changeAdminPassword({ currentPassword, newPassword });
    setIsSubmitting(false);

    if (res.success) {
      onSuccess('Password updated successfully.');
      onClose();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error || 'Failed to update password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass p-6 sm:p-8 rounded-3xl w-full max-w-sm space-y-4 border-white/10 shadow-2xl">
        <h3 className="text-xl font-bold tracking-tight text-foreground">Change Password</h3>
        {error && <div className="p-3 text-xs font-bold text-destructive bg-destructive/10 rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full h-10 glass-input rounded-xl px-4 text-xs font-medium text-foreground"
            required
          />
          <input
            type="password"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-10 glass-input rounded-xl px-4 text-xs font-medium text-foreground"
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-10 glass-input rounded-xl px-4 text-xs font-medium text-foreground"
            required
          />
          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 h-10 glass-button rounded-xl text-xs font-bold hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 h-10 glass-button bg-foreground text-background rounded-xl text-xs font-bold hover:bg-white transition-all"
            >
              {isSubmitting ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
