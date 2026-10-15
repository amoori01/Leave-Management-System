'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, authStorage, User, DynamicBalance, LeaveRequest } from '../../lib/api';
import { Navbar } from '../../components/Navbar';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  Loader2,
  CalendarDays,
  FileText,
  HelpCircle,
} from 'lucide-react';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<DynamicBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = authStorage.getUser();
    const token = authStorage.getToken();

    if (!token || !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser.role === 'ADMIN') {
      router.push('/admin');
      return;
    }

    setUser(currentUser);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedBalances, fetchedRequests] = await Promise.all([
        api.getMyBalances(),
        api.getLeaveRequests(),
      ]);
      setBalances(fetchedBalances);
      setRequests(fetchedRequests);

      if (fetchedBalances.length > 0 && !leaveTypeId) {
        setLeaveTypeId(fetchedBalances[0].leave_type_id);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time day calculation and validation
  useEffect(() => {
    if (!startDate || !endDate) {
      setCalculatedDays(null);
      setClientError(null);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Normalize input dates
    const startNorm = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endNorm = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    if (startNorm < today) {
      setClientError('Start date cannot be in the past.');
      setCalculatedDays(null);
      return;
    }

    if (endNorm < startNorm) {
      setClientError('End date must be on or after start date.');
      setCalculatedDays(null);
      return;
    }

    const diffMs = endNorm.getTime() - startNorm.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    setCalculatedDays(days);

    // Check balance
    const selectedBalance = balances.find((b) => b.leave_type_id === leaveTypeId);
    if (selectedBalance && days > selectedBalance.remaining_days) {
      setClientError(
        `Requested duration (${days} days) exceeds your remaining ${selectedBalance.leave_type_name} balance (${selectedBalance.remaining_days} days).`,
      );
    } else {
      setClientError(null);
    }
  }, [startDate, endDate, leaveTypeId, balances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientError) return;

    setFormSubmitting(true);
    setSuccessMessage(null);

    try {
      await api.createLeaveRequest({
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || undefined,
      });

      setSuccessMessage('Leave request submitted successfully!');
      setStartDate('');
      setEndDate('');
      setReason('');
      setCalculatedDays(null);
      await loadData();
    } catch (err: any) {
      setClientError(err.message || 'Failed to submit leave request');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12 dark:bg-slate-950">
      <Navbar user={user} />

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Employee Leave Portal
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View your real-time dynamically computed balances and submit new leave requests.
          </p>
        </div>

        {/* Dynamic Balance Cards */}
        <div className="mb-10">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Your Leave Balances ({new Date().getFullYear()})
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((b) => {
              const usedPercentage =
                b.total_days > 0 ? Math.round((b.used_days / b.total_days) * 100) : 0;

              return (
                <div
                  key={b.leave_type_id}
                  className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {b.leave_type_name}
                        </h4>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {b.is_paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {b.description || 'Standard leave allowance'}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {b.remaining_days}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      days remaining / {b.total_days} total
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          b.remaining_days === 0
                            ? 'bg-rose-500'
                            : b.remaining_days <= 3
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, usedPercentage)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                      <span>Used: {b.used_days} days</span>
                      <span>{usedPercentage}% used</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two-Column Grid: Form + History */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Request Form */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Submit Leave Request
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fill out the dates and leave type
                  </p>
                </div>
              </div>

              {successMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {clientError && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{clientError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Leave Type
                  </label>
                  <select
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {balances.map((b) => (
                      <option key={b.leave_type_id} value={b.leave_type_id}>
                        {b.leave_type_name} ({b.remaining_days} days available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {calculatedDays !== null && (
                  <div className="flex items-center justify-between rounded-xl bg-blue-50/60 p-3 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                    <span className="font-medium">Calculated Calendar Days:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">
                      {calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Reason (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide context for your manager (optional)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formSubmitting || !!clientError || !startDate || !endDate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Request</span>
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Request History */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Request History
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Track your past and pending leave requests
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {requests.length} Total
                </span>
              </div>

              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                    No leave requests yet
                  </p>
                  <p className="text-xs text-slate-400">
                    Submit your first request using the form on the left.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                        <th className="pb-3 pr-4">Type</th>
                        <th className="pb-3 pr-4">Dates</th>
                        <th className="pb-3 pr-4">Days</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {requests.map((r) => {
                        const start = new Date(r.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        });
                        const end = new Date(r.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });

                        return (
                          <tr key={r.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-3.5 pr-4">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {r.leaveType?.name || 'Leave'}
                              </span>
                              {r.reason && (
                                <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                                  {r.reason}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 pr-4 text-slate-600 dark:text-slate-300">
                              {start} – {end}
                            </td>
                            <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-white">
                              {r.days_count}d
                            </td>
                            <td className="py-3.5 pr-4">
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
                            <td className="py-3.5 text-slate-500">
                              {r.status === 'PENDING' ? (
                                <span className="text-[11px] text-slate-400">Awaiting review</span>
                              ) : (
                                <div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                    {r.approved_at
                                      ? new Date(r.approved_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                        })
                                      : 'Decided'}
                                  </p>
                                  {r.admin_comment && (
                                    <p className="mt-0.5 text-[10px] text-rose-500 line-clamp-1" title={r.admin_comment}>
                                      Note: {r.admin_comment}
                                    </p>
                                  )}
                                </div>
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
        </div>
      </main>
    </div>
  );
}
