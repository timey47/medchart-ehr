import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';

function ChargeBadge({ status }) {
  if (status === 'paid') return <span className="badge-paid">Paid</span>;
  if (status === 'denied') return <span className="badge-denied">Denied</span>;
  return <span className="badge-pending">Pending</span>;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SummaryCard({ label, amount, count, color, icon }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
        <div className="text-right">
          <div className="text-xs text-gray-400">{count} charge{count !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default function Billing() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newCharge, setNewCharge] = useState({ patientId: '', description: '', amount: '', cptCode: '', status: 'pending' });
  const [saving, setSaving] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['billing', 'summary'],
    queryFn: () => api.get('/billing/summary').then(r => r.data),
  });

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ['billing', 'all', statusFilter],
    queryFn: () => api.get('/billing/all', { params: { status: statusFilter || undefined } }).then(r => r.data),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => api.get('/patients').then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/billing/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/billing/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });

  async function handleAddCharge(e) {
    e.preventDefault();
    if (!newCharge.patientId || !newCharge.description || !newCharge.amount) return;
    setSaving(true);
    try {
      await api.post(`/patients/${newCharge.patientId}/billing`, {
        description: newCharge.description,
        amount: parseFloat(newCharge.amount),
        cptCode: newCharge.cptCode || undefined,
        status: newCharge.status,
      });
      setNewCharge({ patientId: '', description: '', amount: '', cptCode: '', status: 'pending' });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['billing'] });
    } finally {
      setSaving(false);
    }
  }

  const totalAll = (summary?.paid.total ?? 0) + (summary?.pending.total ?? 0) + (summary?.denied.total ?? 0);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Revenue</h1>
          <p className="text-gray-500 text-sm mt-1">Track charges, payments, and insurance</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Charge
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6 lg:col-span-1">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-gray-100">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">${totalAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="text-sm text-gray-500 mt-1">Total Billed</div>
        </div>
        <SummaryCard
          label="Collected"
          amount={summary?.paid.total ?? 0}
          count={summary?.paid.count ?? 0}
          color="bg-green-100"
          icon={<svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <SummaryCard
          label="Pending"
          amount={summary?.pending.total ?? 0}
          count={summary?.pending.count ?? 0}
          color="bg-yellow-100"
          icon={<svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <SummaryCard
          label="Denied"
          amount={summary?.denied.total ?? 0}
          count={summary?.denied.count ?? 0}
          color="bg-red-100"
          icon={<svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Add charge form */}
      {showForm && (
        <form onSubmit={handleAddCharge} className="card p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Charge</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
              <select
                className="input"
                value={newCharge.patientId}
                onChange={e => setNewCharge(c => ({ ...c, patientId: e.target.value }))}
                required
              >
                <option value="">Select patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input
                className="input"
                placeholder="e.g. Office Visit - Level 3"
                value={newCharge.description}
                onChange={e => setNewCharge(c => ({ ...c, description: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                placeholder="0.00"
                value={newCharge.amount}
                onChange={e => setNewCharge(c => ({ ...c, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPT Code</label>
              <input
                className="input"
                placeholder="e.g. 99213"
                value={newCharge.cptCode}
                onChange={e => setNewCharge(c => ({ ...c, cptCode: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Add Charge'}
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <select className="input w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      {/* Charges table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">CPT</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : charges.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No charges found</td>
              </tr>
            ) : (
              charges.map(charge => (
                <tr key={charge.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/patients/${charge.patient.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {charge.patient.firstName} {charge.patient.lastName}
                    </Link>
                    <div className="text-xs text-gray-400 font-mono">{charge.patient.mrn}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{charge.description}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{charge.cptCode || '—'}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">${charge.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(charge.createdAt)}</td>
                  <td className="px-6 py-4"><ChargeBadge status={charge.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        className="input w-auto text-xs"
                        value={charge.status}
                        onChange={e => updateMutation.mutate({ id: charge.id, status: e.target.value })}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="denied">Denied</option>
                      </select>
                      <button
                        onClick={() => deleteMutation.mutate(charge.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete charge"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
