import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';

function NoteTypeBadge({ type }) {
  const colors = {
    soap: 'bg-purple-100 text-purple-700',
    assessment: 'bg-teal-100 text-teal-700',
    general: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[type] ?? colors.general}`}>
      {type}
    </span>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function Notes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [newNote, setNewNote] = useState({ patientId: '', content: '', type: 'general' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => api.get('/patients').then(r => r.data),
  });

  // Gather notes from all patients (via each patient's chart)
  const { data: allNotes = [], isLoading } = useQuery({
    queryKey: ['allNotes'],
    queryFn: async () => {
      const patientList = await api.get('/patients').then(r => r.data);
      const noteArrays = await Promise.all(
        patientList.map(p =>
          api.get(`/patients/${p.id}/notes`).then(r =>
            r.data.map(n => ({ ...n, patientName: `${p.firstName} ${p.lastName}`, patientId: p.id }))
          )
        )
      );
      return noteArrays.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ patientId, noteId }) => api.delete(`/patients/${patientId}/notes/${noteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allNotes'] }),
  });

  async function handleAddNote(e) {
    e.preventDefault();
    if (!newNote.patientId || !newNote.content.trim()) return;
    setSaving(true);
    try {
      await api.post(`/patients/${newNote.patientId}/notes`, {
        content: newNote.content,
        type: newNote.type,
      });
      setNewNote({ patientId: '', content: '', type: 'general' });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['allNotes'] });
    } finally {
      setSaving(false);
    }
  }

  const filtered = allNotes.filter(n => {
    if (typeFilter && n.type !== typeFilter) return false;
    if (selectedPatient && n.patientId !== selectedPatient) return false;
    if (search) {
      const s = search.toLowerCase();
      return n.content.toLowerCase().includes(s) || n.patientName.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Provider Notes</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} note{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Note
        </button>
      </div>

      {/* New note form */}
      {showForm && (
        <form onSubmit={handleAddNote} className="card p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add Note</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
              <select
                className="input"
                value={newNote.patientId}
                onChange={e => setNewNote(n => ({ ...n, patientId: e.target.value }))}
                required
              >
                <option value="">Select patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note Type</label>
              <select
                className="input"
                value={newNote.type}
                onChange={e => setNewNote(n => ({ ...n, type: e.target.value }))}
              >
                <option value="general">General</option>
                <option value="soap">SOAP</option>
                <option value="assessment">Assessment</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Note Content *</label>
            <textarea
              className="input min-h-[120px] resize-none"
              placeholder="Enter clinical note..."
              value={newNote.content}
              onChange={e => setNewNote(n => ({ ...n, content: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-9"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-40" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="general">General</option>
          <option value="soap">SOAP</option>
          <option value="assessment">Assessment</option>
        </select>
        <select className="input w-48" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>
          <option value="">All patients</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
          ))}
        </select>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 text-sm">
          {search || typeFilter || selectedPatient ? 'No notes match your filters.' : 'No notes yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(note => (
            <div key={note.id} className="card p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Link
                    to={`/patients/${note.patientId}`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {note.patientName}
                  </Link>
                  <NoteTypeBadge type={note.type} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                  <button
                    onClick={() => deleteMutation.mutate({ patientId: note.patientId, noteId: note.id })}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-gray-400 mt-3">By {note.author.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
