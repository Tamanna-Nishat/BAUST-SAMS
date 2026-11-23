import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { StaffPermissions, User, UserRole } from '../../types/sams';
import { apiFetch } from '../../utils/api';

const EMPTY_PERMS: StaffPermissions = {
  can_review: true,
  can_forward: true,
  can_request_info: true,
  can_approve: false,
  can_reject: false,
  can_answer_questions: true,
  can_manage_guidelines: false,
  can_access_medical: false,
};

const PERMISSION_LABELS: { key: keyof StaffPermissions; label: string }[] = [
  { key: 'can_review', label: 'Review & Update Status' },
  { key: 'can_request_info', label: 'Request Student Information' },
  { key: 'can_forward', label: 'Forward to Other Offices' },
  { key: 'can_approve', label: 'Approve Applications' },
  { key: 'can_reject', label: 'Reject Applications' },
  { key: 'can_answer_questions', label: 'Answer Student Questions' },
  { key: 'can_manage_guidelines', label: 'Manage Guidelines' },
  { key: 'can_access_medical', label: 'Confidential Medical Document Access' },
];

export function AdminUsersPage() {
  const { catalog, isDemoMode, demoUsers } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [newOfficeId, setNewOfficeId] = useState('off-reg');
  const [newDesignation, setNewDesignation] = useState('');
  const [newPerms, setNewPerms] = useState<StaffPermissions>({ ...EMPTY_PERMS });

  useEffect(() => {
    if (isDemoMode) {
      setUsers(demoUsers);
      setLoading(false);
      return;
    }
    apiFetch<{ users: User[] }>('/api/admin/users')
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, [isDemoMode, demoUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.baustId ?? '').toLowerCase().includes(q) ||
        (u.officeName ?? '').toLowerCase().includes(q) ||
        (u.department ?? '').toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'Creating user accounts is disabled in Demo Preview Mode. Configure PostgreSQL and sign in with a real administrator account.'
      );
      setShowCreate(false);
      return;
    }

    try {
      const res = await apiFetch<{ user: User }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          officeId: newRole === 'student' ? undefined : newOfficeId,
          designation: newDesignation || undefined,
          permissions: newPerms,
        }),
      });
      setUsers((prev) => [res.user, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewDesignation('');
      setMessage(`Account created for ${res.user.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setMessage('');
    setDemoNotice('');

    if (isDemoMode) {
      setEditingUser(null);
      setDemoNotice(
        'Updating user roles and staff permissions is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as an administrator to persist access control changes.'
      );
      return;
    }

    try {
      const res = await apiFetch<{ user: User }>(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: editingUser.role,
          officeId: editingUser.officeId || null,
          designation: editingUser.designation,
          permissions: editingUser.permissions,
          isActive: editingUser.isActive,
        }),
      });
      setUsers((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
      setEditingUser(null);
      setMessage(`Updated role and permissions for ${res.user.fullName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user.');
    }
  };

  return (
    <PortalLayout title="User, Role & Permission Management" breadcrumb="Admin Portal / Users & Permissions">
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}
        {message && (
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
            {message}
          </div>
        )}
        {demoNotice && <DemoNotice message={demoNotice} />}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0F2547] hover:bg-[#173463] text-white"
          >
            {showCreate ? 'Close Form' : 'Create Staff / User Account'}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreateUser} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0F2547]">Create New Account</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">University Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Administrator</option>
                  <option value="student">Student</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Office</label>
                <select
                  disabled={newRole === 'student'}
                  value={newOfficeId}
                  onChange={(e) => setNewOfficeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                >
                  {catalog.offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  placeholder="e.g. Assistant Registrar"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {newRole === 'staff' && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Staff Permission Level</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PERMISSION_LABELS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={newPerms[p.key]}
                        onChange={(e) => setNewPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white"
            >
              Create User Account
            </button>
          </form>
        )}

        {editingUser && (
          <form onSubmit={handleSavePermissions} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#0F2547]">
                Edit Role &amp; Permissions: {editingUser.fullName}
              </h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Assignment</label>
                <select
                  value={editingUser.officeId ?? ''}
                  onChange={(e) => setEditingUser({ ...editingUser, officeId: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">None</option>
                  {catalog.offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={editingUser.designation ?? ''}
                  onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editingUser.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.value === 'active' })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Deactivated</option>
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Granular Authority Controls</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PERMISSION_LABELS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={Boolean(editingUser.permissions?.[p.key])}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          permissions: {
                            ...editingUser.permissions,
                            [p.key]: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0F2547] text-white">
              Save Role &amp; Permissions
            </button>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, BAUST ID, or office..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="staff">Staff</option>
            <option value="admin">Administrators</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-8 text-sm text-slate-500">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-600">No user accounts match your current search or filter.</p>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-slate-200">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{u.fullName}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                      <span className={u.isActive ? 'text-xs text-emerald-700 font-medium' : 'text-xs text-rose-700 font-medium'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="capitalize font-semibold text-[#0F2547]">{u.role}</span>
                      <span>·</span>
                      <span>
                        {u.role === 'student'
                          ? `${u.baustId || '—'} · ${u.department || ''}`
                          : u.officeName || u.designation || '—'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...u })}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Manage Permissions
                    </button>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-6">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Office / ID</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-6">
                          <p className="font-medium text-slate-900">{u.fullName}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </td>
                        <td className="py-3.5 px-4 capitalize text-xs font-semibold text-[#0F2547]">{u.role}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {u.role === 'student'
                            ? `${u.baustId || '—'} · ${u.department || ''}`
                            : u.officeName || u.designation || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className={u.isActive ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingUser({ ...u })}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                          >
                            Manage Permissions
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
