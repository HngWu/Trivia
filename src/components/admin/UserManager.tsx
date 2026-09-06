'use client';

import React, { useState, useMemo } from 'react';
import { AdminUserView, createAdminUser, updateAdminUser, deleteAdminUser } from '@/lib/auth/actions';
import Toast from '@/components/shared/Toast';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  X, 
  Check, 
  AlertTriangle, 
  Lock, 
  Mail,
  UserCheck
} from 'lucide-react';

interface UserManagerProps {
  initialUsers: AdminUserView[];
  currentUserId?: string;
}

export default function UserManager({ initialUsers, currentUserId }: UserManagerProps) {
  const [users, setUsers] = useState<AdminUserView[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserView | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUserView | null>(null);

  // Create Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Edit Form State
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase().trim();
    return users.filter(u => u.email.toLowerCase().includes(q));
  }, [users, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword) return;

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const res = await createAdminUser({ email: newEmail, password: newPassword });
    setIsSubmitting(false);

    if (res.success && res.user) {
      setUsers(prev => [...prev, res.user!]);
      setNewEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setIsCreateModalOpen(false);
      showToast('Administrator created successfully.');
    } else {
      showToast(res.error || 'Failed to create user.');
    }
  };

  const startEdit = (user: AdminUserView) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditPassword('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editPassword && editPassword.length < 6) {
      showToast('New password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const payload: { id: string; email?: string; password?: string } = { id: editingUser.id };
    if (editEmail !== editingUser.email) payload.email = editEmail;
    if (editPassword) payload.password = editPassword;

    const res = await updateAdminUser(payload);
    setIsSubmitting(false);

    if (res.success) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, email: editEmail } : u));
      setEditingUser(null);
      showToast('Administrator updated successfully.');
    } else {
      showToast(res.error || 'Failed to update user.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;

    setIsSubmitting(true);
    const res = await deleteAdminUser(deleteConfirmUser.id);
    setIsSubmitting(false);

    if (res.success) {
      setUsers(prev => prev.filter(u => u.id !== deleteConfirmUser.id));
      setDeleteConfirmUser(null);
      showToast('Administrator account removed.');
    } else {
      showToast(res.error || 'Failed to delete administrator.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto py-4">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="space-y-1">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Administrators</h2>
        <p className="text-gray-500 text-xs sm:text-sm">Manage local administrator credentials, access permissions, and session authorization.</p>
      </div>

      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-5 rounded-3xl border-white/5">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>Total Admins:</span>
            <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">{users.length}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            <span>Active Session Verified</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 glass-input rounded-xl pl-9 pr-8 text-xs font-medium text-foreground placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-white transition-all flex items-center gap-2 shrink-0 active:scale-95 shadow-lg shadow-white/5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Admin</span>
          </button>
        </div>
      </div>

      {/* Admin Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map(u => {
          const isCurrentUser = currentUserId === u.id;
          const isOnlyOne = users.length <= 1;

          return (
            <div
              key={u.id}
              className={`glass p-6 rounded-3xl border transition-all shadow-xl flex flex-col justify-between group ${
                isCurrentUser ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/5 hover:border-white/15'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold text-foreground">
                    {u.email.charAt(0).toUpperCase()}
                  </div>

                  {isCurrentUser ? (
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Active You
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase bg-white/5 text-gray-400 border border-white/5 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                      Admin
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground truncate" title={u.email}>
                    {u.email}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                    <span>Joined:</span>
                    <span className="text-gray-400 font-medium">
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  onClick={() => startEdit(u)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => setDeleteConfirmUser(u)}
                  disabled={isCurrentUser || isOnlyOne}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 flex items-center gap-1.5"
                  title={
                    isCurrentUser 
                      ? "Cannot delete your own account" 
                      : isOnlyOne 
                      ? "Cannot delete the only remaining admin" 
                      : "Delete Administrator"
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE ADMIN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="glass max-w-md w-full rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-bold text-foreground">Add Administrator</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="newadmin@trivia.local"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full h-11 glass-input rounded-xl pl-9 pr-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Password (Min 6 characters) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full h-11 glass-input rounded-xl pl-9 pr-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full h-11 glass-input rounded-xl pl-9 pr-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 h-11 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newEmail.trim() || !newPassword}
                  className="px-6 h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-white/5"
                >
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="glass max-w-md w-full rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-bold text-foreground">Edit Administrator</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full h-11 glass-input rounded-xl px-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Reset Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  className="w-full h-11 glass-input rounded-xl px-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 h-11 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editEmail.trim()}
                  className="px-6 h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-white/5"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="glass max-w-md w-full rounded-3xl border border-red-500/20 shadow-2xl p-6 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-foreground">Remove Administrator</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Are you sure you want to remove administrator <span className="text-white font-bold">&ldquo;{deleteConfirmUser.email}&rdquo;</span>?
                This user will no longer be able to log in to the admin control center.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 h-11 rounded-xl text-xs font-bold border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
              >
                {isSubmitting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
