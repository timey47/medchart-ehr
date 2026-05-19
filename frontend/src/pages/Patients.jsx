import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';

function StatusBadge({ status }) {
  if (status === 'Waiting') return <span className="badge-waiting">Waiting</span>;
  if (status === 'InProgress') return <span className="badge-inprogress">In Progress</span>;
  return <span className="badge-completed">Completed</span>;
}

function age(dob) {
  return Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));
}

const EMPTY = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '', email: '',
  phone: '', address: '', status: 'Waiting', insurance: '',
};

function PatientModal({ patient, onClose, onSave }) {
  const [form, setForm] = useState(
    patient
      ? { ...patient, dateOfBirth: patient.dateOfBirth?.slice(0, 10) }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{patient ? 'Edit Patient' : 'New Patient'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input className="input" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input className="input" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
              <input type="date" className="input" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)} required>
                <option value="">Select...</option>
                <option>Male</option>
                <option>Female</option>
                <option>Non-binary</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Insurance</label>
              <input className="input" value={form.insurance} onChange={e => set('insurance', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="Waiting">Waiting</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Patients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search, statusFilter],
    queryFn: () =>
      api.get('/patients', { params: { search: search || undefined, status: statusFilter || undefined } }).then(r => r.data),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/patients', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/patients/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });

  function handleSave(form) {
    if (modal.patient) {
      return updateMutation.mutateAsync({ id: modal.patient.id, ...form });
    }
    return createMutation.mutateAsync(form);
  }

  return (
    <div className="p-4 sm:p-8">
      {modal && (
        <PatientModal patient={modal.patient} onClose={() => setModal(null)} onSave={handleSave} />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Delete Patient?</h3>
            <p className="text-sm text-gray-500 mb-6">This will permanently delete the patient and all their records.</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button
                className="btn-danger"
                onClick={() => { deleteMutation.mutate(deleteId); setDeleteId(null); }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Registry</h1>
          <p className="text-gray-500 text-sm mt-1">{patients.length} patient{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ patient: null })}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Patient
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-9"
            placeholder="Search name, email, or MRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Waiting">Waiting</option>
          <option value="InProgress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">MRN</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Age / Gender</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  {search || statusFilter ? 'No patients match your filters.' : 'No patients yet. Add your first patient.'}
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/patients/${p.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 hover:text-blue-600">{p.firstName} {p.lastName}</div>
                        <div className="text-xs text-gray-400">{p.email || p.phone || '—'}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{p.mrn}</td>
                  <td className="px-6 py-4 text-gray-600">{age(p.dateOfBirth)} y · {p.gender}</td>
                  <td className="px-6 py-4 text-gray-600">{p.insurance || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/patients/${p.id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="View chart">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button onClick={() => setModal({ patient: p })} className="text-gray-400 hover:text-gray-600 transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteId(p.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
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
    </div>
  );
}
