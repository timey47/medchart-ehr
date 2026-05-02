import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';

const COLUMNS = [
  {
    id: 'Waiting',
    label: 'Waiting',
    color: 'bg-amber-500',
    light: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'InProgress',
    label: 'In Progress',
    color: 'bg-blue-500',
    light: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'Completed',
    label: 'Completed',
    color: 'bg-green-500',
    light: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-800',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function age(dob) {
  return Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));
}

function PatientCard({ patient, col, onDragStart, onStatusChange }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(patient.id)}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div>
            <Link
              to={`/patients/${patient.id}`}
              className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {patient.firstName} {patient.lastName}
            </Link>
            <div className="text-xs text-gray-400">{age(patient.dateOfBirth)} y · {patient.gender}</div>
          </div>
        </div>
        <select
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
          value={patient.status}
          onChange={e => onStatusChange(patient.id, e.target.value)}
          onClick={e => e.stopPropagation()}
        >
          <option value="Waiting">Waiting</option>
          <option value="InProgress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      <div className="space-y-1.5 text-xs text-gray-500">
        {patient.insurance && (
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {patient.insurance}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {patient._count?.notes ?? 0} note{(patient._count?.notes ?? 0) !== 1 ? 's' : ''}
        </div>
        <div className="font-mono text-gray-300 text-[10px]">{patient.mrn}</div>
      </div>
    </div>
  );
}

export default function Kanban() {
  const qc = useQueryClient();
  const [draggingId, setDraggingId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', 'kanban'],
    queryFn: () => api.get('/patients').then(r => r.data),
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/patients/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['patients', 'kanban'] });
      const prev = qc.getQueryData(['patients', 'kanban']);
      qc.setQueryData(['patients', 'kanban'], (old) =>
        old?.map(p => p.id === id ? { ...p, status } : p)
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      qc.setQueryData(['patients', 'kanban'], ctx?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  function handleDrop(colId) {
    if (draggingId && dragOver === colId) {
      const patient = patients.find(p => p.id === draggingId);
      if (patient && patient.status !== colId) {
        statusMutation.mutate({ id: draggingId, status: colId });
      }
    }
    setDraggingId(null);
    setDragOver(null);
  }

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = patients.filter(p => p.status === col.id);
    return acc;
  }, {});

  return (
    <div className="p-8 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Board</h1>
        <p className="text-gray-500 text-sm mt-1">Drag cards between columns to update patient status</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-6">
          {COLUMNS.map(col => (
            <div key={col.id} className="space-y-3">
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6 h-full">
          {COLUMNS.map(col => {
            const cards = grouped[col.id] ?? [];
            const isDragTarget = dragOver === col.id;

            return (
              <div
                key={col.id}
                onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.id)}
                className={`rounded-2xl border-2 transition-colors ${isDragTarget ? col.light + ' scale-[1.01]' : 'border-transparent bg-gray-100'} p-4`}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-1.5 rounded-lg ${col.color} text-white`}>
                    {col.icon}
                  </div>
                  <span className="font-semibold text-gray-800">{col.label}</span>
                  <span className={`ml-auto inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${col.badge}`}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3 min-h-[200px]">
                  {cards.length === 0 && !isDragTarget ? (
                    <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl">
                      <p className="text-xs text-gray-400">Drop here</p>
                    </div>
                  ) : (
                    cards.map(p => (
                      <PatientCard
                        key={p.id}
                        patient={p}
                        col={col}
                        onDragStart={setDraggingId}
                        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
