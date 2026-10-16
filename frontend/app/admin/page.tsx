'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  authStorage,
  User,
  ManagedUser,
  LeaveRequest,
  LeaveRequestDetail,
} from '../../lib/api';
import { Navbar } from '../../components/Navbar';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Loader2,
  FileText,
  Filter,
  Check,
  X,
  Calendar,
  User as UserIcon,
  MessageSquare,
  Users,
  UserPlus,
  Plus,
  Lock,
  Mail,
  Trash2,
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'EMPLOYEES'>('REQUESTS');

  // Requests State
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  >('ALL');

  // Employees State
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Add Employee Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');
  const [newUserAnnualDays, setNewUserAnnualDays] = useState(20);
  const [newUserSickDays, setNewUserSickDays] = useState(10);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);

  // Delete Employee State
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [requestDetail, setRequestDetail] =
    useState<LeaveRequestDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = authStorage.getUser();
    const token = authStorage.getToken();

    if (!token || !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser.role !== 'ADMIN') {
      router.push('/employee');
      return;
    }

    setUser(currentUser);
    loadRequests();
    loadUsers();
  }, [router]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await api.getLeaveRequests();
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to load admin requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await api.getUsers();
      setUsersList(data);
    } catch (err: any) {
      console.error('Failed to load users list:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserLoading(true);
    setAddUserError(null);
    setAddUserSuccess(null);

    try {
      await api.createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        annual_days: Number(newUserAnnualDays),
        sick_days: Number(newUserSickDays),
      });

      setAddUserSuccess(`Account for ${newUserName} created successfully with default leave balances!`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('EMPLOYEE');
      setNewUserAnnualDays(20);
      setNewUserSickDays(10);
      await loadUsers();
    } catch (err: any) {
      setAddUserError(err.message || 'Failed to create user');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await api.deleteUser(userToDelete.id);
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove employee');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenDetail = async (id: string) => {
    setSelectedRequestId(id);
    setActionError(null);
    setActionSuccess(null);
    setAdminComment('');
    setModalLoading(true);

    try {
      const detail = await api.getLeaveRequestDetails(id);
      setRequestDetail(detail);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load request details');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedRequestId(null);
    setRequestDetail(null);
    setAdminComment('');
    setActionError(null);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.approveLeaveRequest(id);
      setActionSuccess('Request approved successfully!');
      await loadRequests();
      if (selectedRequestId === id) {
        // Refresh modal data
        const updated = await api.getLeaveRequestDetails(id);
        setRequestDetail(updated);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.rejectLeaveRequest(id, adminComment.trim() || undefined);
      setActionSuccess('Request rejected successfully.');
      await loadRequests();
      if (selectedRequestId === id) {
        // Refresh modal data
        const updated = await api.getLeaveRequestDetails(id);
        setRequestDetail(updated);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  // Stats calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 dark:bg-slate-950">
      <Navbar user={user} />

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Administrator Review Portal
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review company-wide leave requests, inspect employee balances, and
            record decisions.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'REQUESTS'
                ? 'border-zinc-950 text-zinc-950 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Leave Requests</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {requests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EMPLOYEES')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'EMPLOYEES'
                ? 'border-zinc-950 text-zinc-950 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Employee Directory</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {usersList.length}
            </span>
          </button>
        </div>

        {activeTab === 'REQUESTS' ? (
          <>
            {/* Metric Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Submissions
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {totalCount}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Review
            </p>
            <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Approved
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {approvedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Rejected
            </p>
            <p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300">
              {rejectedCount}
            </p>
          </div>
        </div>

        {/* Requests Management Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Table Toolbar & Filters */}
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Filter by Status:
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      filterStatus === status
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status === 'ALL' ? 'All Requests' : status}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Table */}
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <FileText className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                No requests found
              </p>
              <p className="text-xs text-slate-400">
                No leave requests match the current filter selection.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                    <th className="py-3.5 pl-6 pr-4">Employee</th>
                    <th className="py-3.5 pr-4">Type</th>
                    <th className="py-3.5 pr-4">Dates</th>
                    <th className="py-3.5 pr-4">Days</th>
                    <th className="py-3.5 pr-4">Status</th>
                    <th className="py-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRequests.map((r) => {
                    const start = new Date(r.start_date).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric' },
                    );
                    const end = new Date(r.end_date).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric' },
                    );

                    return (
                      <tr
                        key={r.id}
                        className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-4 pl-6 pr-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {r.user?.name || 'Unknown User'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {r.user?.email}
                          </p>
                        </td>
                        <td className="py-4 pr-4">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {r.leaveType?.name}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-slate-600 dark:text-slate-300">
                          {start} – {end}
                        </td>
                        <td className="py-4 pr-4 font-bold text-slate-900 dark:text-white">
                          {r.days_count}d
                        </td>
                        <td className="py-4 pr-4">
                          {r.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                          {r.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          )}
                          {r.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              <XCircle className="h-3 w-3" /> Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenDetail(r.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5" /> Details
                            </button>
                            {r.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApprove(r.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm transition hover:bg-emerald-700"
                                >
                                  <Check className="h-3.5 w-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => handleOpenDetail(r.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm transition hover:bg-rose-700"
                                >
                                  <X className="h-3.5 w-3.5" /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    ) : (
      <div className="space-y-6">
        {/* Employee Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Staff
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {usersList.length}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">
              Regular Employees
            </p>
            <p className="mt-2 text-2xl font-black text-zinc-900 dark:text-white">
              {usersList.filter((u) => u.role === 'EMPLOYEE').length}
            </p>
          </div>
          <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-5 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Administrators
            </p>
            <p className="mt-2 text-2xl font-black text-purple-700 dark:text-purple-300">
              {usersList.filter((u) => u.role === 'ADMIN').length}
            </p>
          </div>
        </div>

        {/* Employee Directory Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Company Staff Directory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Provision new employee accounts and manage organizational roles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAddUserError(null);
                setAddUserSuccess(null);
                setIsAddUserModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-black via-zinc-900 to-zinc-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-zinc-900 hover:to-zinc-800 active:from-black active:to-zinc-900"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add New Employee</span>
            </button>
          </div>

          {usersLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-100" />
            </div>
          ) : usersList.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No staff members found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3">Staff Member</th>
                    <th className="px-3 py-3.5">Email</th>
                    <th className="px-3 py-3.5">System Role</th>
                    <th className="px-3 py-3.5">Onboarded</th>
                    <th className="px-3 py-3.5 text-center">Status</th>
                    <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usersList.map((u) => {
                    const initials = u.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <tr
                        key={u.id}
                        className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                      >
                        <td className="py-4 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {u.name}
                              </div>
                              <div className="font-mono text-[11px] text-slate-400">
                                ID: {u.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-xs text-slate-600 dark:text-slate-300">
                          {u.email}
                        </td>
                        <td className="px-3 py-4">
                          {u.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                              <ShieldCheck className="h-3 w-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <UserIcon className="h-3 w-3" /> Employee
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-xs text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString(
                            undefined,
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            },
                          )}
                        </td>
                        <td className="px-3 py-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        </td>
                        <td className="py-4 pl-3 pr-6 text-right">
                          {u.id === user?.id ? (
                            <span className="text-[11px] font-medium italic text-slate-400">
                              (Current User)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setUserToDelete(u);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

        {/* Request Detail & Decision Modal */}
        {selectedRequestId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Leave Request Review
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ID: {selectedRequestId}
                  </p>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : requestDetail ? (
                <div className="space-y-6 pt-4">
                  {actionSuccess && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{actionSuccess}</span>
                    </div>
                  )}

                  {actionError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Requester Info & Requested Dates */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Employee
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                        {requestDetail.user?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {requestDetail.user?.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Leave Type & Duration
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                        {requestDetail.leaveType?.name} (
                        {requestDetail.days_count} days)
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(
                          requestDetail.start_date,
                        ).toLocaleDateString()}{' '}
                        –{' '}
                        {new Date(requestDetail.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {requestDetail.reason && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Submitted Reason
                      </p>
                      <p className="mt-1 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        &quot;{requestDetail.reason}&quot;
                      </p>
                    </div>
                  )}

                  {/* Requester's Live Balances */}
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Requester&apos;s Dynamic Leave Balances
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {requestDetail.requester_balances?.map((b) => (
                        <div
                          key={b.leave_type_id}
                          className="rounded-xl border border-slate-200/80 p-3 text-xs dark:border-slate-800"
                        >
                          <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
                            <span>{b.leave_type_name}</span>
                            <span
                              className={
                                b.remaining_days < requestDetail.days_count &&
                                b.leave_type_id === requestDetail.leave_type_id
                                  ? 'font-bold text-rose-600'
                                  : 'text-emerald-600'
                              }
                            >
                              {b.remaining_days} days remaining
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Total: {b.total_days}d | Used: {b.used_days}d
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Requester's Past Leave History */}
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Requester&apos;s Leave History (
                      {requestDetail.requester_history?.length || 0})
                    </h4>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {requestDetail.requester_history?.map((h) => (
                            <tr key={h.id} className="p-2">
                              <td className="py-2 pl-3 font-medium text-slate-800 dark:text-slate-200">
                                {h.leaveType?.name}
                              </td>
                              <td className="py-2 text-slate-500">
                                {new Date(h.start_date).toLocaleDateString()} (
                                {h.days_count}d)
                              </td>
                              <td className="py-2 pr-3 text-right">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    h.status === 'APPROVED'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : h.status === 'REJECTED'
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  }`}
                                >
                                  {h.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Decision Actions for PENDING */}
                  {requestDetail.status === 'PENDING' ? (
                    <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Rejection Reason / Admin Comment (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                          placeholder="e.g. Insufficient coverage during team sprint"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleReject(requestDetail.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                        >
                          <X className="h-4 w-4" />
                          <span>Reject Request</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(requestDetail.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve Request</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-800/40">
                      This request has already been decided with status{' '}
                      <span className="font-bold">{requestDetail.status}</span>.
                      {requestDetail.admin_comment && (
                        <p className="mt-1 text-slate-600 dark:text-slate-300">
                          Comment: &quot;{requestDetail.admin_comment}&quot;
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Add Employee Modal */}
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-zinc-100 p-2 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Add New Employee
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Provision credentials and initialize annual leave balances.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {addUserError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addUserError}</span>
                </div>
              )}

              {addUserSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{addUserSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-zinc-800 focus:bg-white focus:ring-4 focus:ring-zinc-800/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. sarah.jenkins@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-zinc-800 focus:bg-white focus:ring-4 focus:ring-zinc-800/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-zinc-800 focus:bg-white focus:ring-4 focus:ring-zinc-800/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    System Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'EMPLOYEE' | 'ADMIN')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-zinc-800 focus:bg-white focus:ring-4 focus:ring-zinc-800/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-zinc-400"
                  >
                    <option value="EMPLOYEE">Employee (Can request leave, view personal balances)</option>
                    <option value="ADMIN">Administrator (Can review requests, provision accounts)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Annual Leave Days
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newUserAnnualDays}
                      onChange={(e) => setNewUserAnnualDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-zinc-800 focus:bg-white focus:ring-4 focus:ring-zinc-800/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-zinc-400"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Default: 20 days/year</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Sick Leave Days
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newUserSickDays}
                      onChange={(e) => setNewUserSickDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-zinc-800 focus:bg-white focus:ring-4 focus:ring-zinc-800/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-zinc-400"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Default: 10 days/year</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addUserLoading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-black via-zinc-900 to-zinc-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-zinc-900 hover:to-zinc-800 active:from-black active:to-zinc-900 disabled:opacity-50"
                  >
                    {addUserLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Create Employee</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Remove Employee
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This action will permanently delete the account from the database.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">{userToDelete.name}</span> ({userToDelete.email})?
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  All associated leave requests and balance allowances will be permanently removed.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setUserToDelete(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDeleteUser}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>Permanently Remove</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
