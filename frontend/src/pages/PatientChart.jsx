import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

function StatusBadge({ status }) {
  if (status === 'Waiting') return <span className="badge-waiting">Waiting</span>;
  if (status === 'InProgress') return <span className="badge-inprogress">In Progress</span>;
  return <span className="badge-completed">Completed</span>;
}

function ChargeBadge({ status }) {
  if (status === 'paid') return <span className="badge-paid">Paid</span>;
  if (status === 'denied') return <span className="badge-denied">Denied</span>;
  return <span className="badge-pending">Pending</span>;
}

function age(dob) {
  return Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function NoteTypeBadge({ type }) {
  const colors = { soap: 'bg-purple-100 text-purple-700', assessment: 'bg-teal-100 text-teal-700', general: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[type] ?? colors.general}`}>{type}</span>;
}

export default function PatientChart() {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [savingNote, setSavingNote] = useState(false);

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => api.patch(`/patients/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patient', id] }); qc.invalidateQueries({ queryKey: ['patients'] }); },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId) => api.delete(`/patients/${id}/notes/${noteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient', id] }),
  });

  const updateChargeMutation = useMutation({
    mutationFn: ({ chargeId, status }) => api.patch(`/billing/${chargeId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient', id] }),
  });

  async function submitNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/patients/${id}/notes`, { content: noteText, type: noteType });
      setNoteText('');
      qc.invalidateQueries({ queryKey: ['patient', id] });
    } finally {
      setSavingNote(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-4 sm:p-8">
        <div className="card p-12 text-center">
          <p className="text-gray-500 mb-4">Patient not found.</p>
          <Link to="/patients" className="btn-secondary">Back to Patients</Link>
        </div>
      </div>
    );
  }

  const totalCharges = patient.charges.reduce((s, c) => s + c.amount, 0);
  const paidCharges = patient.charges.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);

  const tabs = ['overview', 'notes', 'billing'];

  return (
    <div className="p-4 sm:p-8">
      {/* Back */}
      <Link to="/patients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Patient Registry
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{patient.firstName} {patient.lastName}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                <span>MRN: <span className="font-mono">{patient.mrn}</span></span>
                <span className="hidden sm:inline">·</span>
                <span>{age(patient.dateOfBirth)} y · {patient.gender}</span>
                <span className="hidden sm:inline">·</span>
                <span>{patient.insurance || 'No insurance'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={patient.status} />
            <select
              className="input w-auto text-xs"
              value={patient.status}
              onChange={e => statusMutation.mutate(e.target.value)}
            >
              <option value="Waiting">Move to Waiting</option>
              <option value="InProgress">Move to In Progress</option>
              <option value="Completed">Move to Completed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-400">DOB</div>
            <div className="text-sm font-medium text-gray-800 mt-0.5">{formatDate(patient.dateOfBirth)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Phone</div>
            <div className="text-sm font-medium text-gray-800 mt-0.5">{patient.phone || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Email</div>
            <div className="text-sm font-medium text-gray-800 mt-0.5">{patient.email || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Address</div>
            <div className="text-sm font-medium text-gray-800 mt-0.5">{patient.address || '—'}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'overview' ? 'Overview' : t === 'notes' ? `Notes (${patient.notes.length})` : `Billing (${patient.charges.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{patient.notes.length}</div>
            <div className="text-sm text-gray-500 mt-1">Total Notes</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-green-600">${paidCharges.toFixed(2)}</div>
            <div className="text-sm text-gray-500 mt-1">Collected</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-amber-600">${(totalCharges - paidCharges).toFixed(2)}</div>
            <div className="text-sm text-gray-500 mt-1">Outstanding</div>
          </div>
          {patient.notes.length > 0 && (
            <div className="md:col-span-3 card p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Latest Note</h3>
              <div className="flex items-start gap-3">
                <NoteTypeBadge type={patient.notes[0].type} />
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed">{patient.notes[0].content}</p>
                  <p className="text-xs text-gray-400 mt-2">{patient.notes[0].author.name} · {formatDate(patient.notes[0].createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes tab */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <form onSubmit={submitNote} className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Add Note</h3>
            <div className="flex gap-3 mb-3">
              {['general', 'soap', 'assessment'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNoteType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    noteType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              className="input min-h-[100px] resize-none mb-3"
              placeholder="Enter clinical note..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingNote || !noteText.trim()}>
                {savingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </form>

          {patient.notes.length === 0 ? (
            <div className="card p-12 text-center text-gray-400 text-sm">No notes yet</div>
          ) : (
            patient.notes.map(note => (
              <div key={note.id} className="card p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <NoteTypeBadge type={note.type} />
                    <span className="text-xs text-gray-400">{note.author.name} · {formatDate(note.createdAt)}</span>
                  </div>
                  <button
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Billing tab */}
      {tab === 'billing' && (
        <div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">CPT</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patient.charges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No charges on file</td>
                  </tr>
                ) : (
                  patient.charges.map(charge => (
                    <tr key={charge.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{charge.description}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{charge.cptCode || '—'}</td>
                      <td className="px-6 py-4 text-gray-900">${charge.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(charge.createdAt)}</td>
                      <td className="px-6 py-4"><ChargeBadge status={charge.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <select
                          className="input w-auto text-xs"
                          value={charge.status}
                          onChange={e => updateChargeMutation.mutate({ chargeId: charge.id, status: e.target.value })}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="denied">Denied</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {patient.charges.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={2} className="px-6 py-3 text-xs font-medium text-gray-500">Total</td>
                    <td colSpan={4} className="px-6 py-3 font-semibold text-gray-900">${totalCharges.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
