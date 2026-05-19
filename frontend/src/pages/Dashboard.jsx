import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-700', '-100')}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'Waiting') return <span className="badge-waiting">{status}</span>;
  if (status === 'InProgress') return <span className="badge-inprogress">In Progress</span>;
  return <span className="badge-completed">{status}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/patients/stats').then(r => r.data),
  });

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients', 'recent'],
    queryFn: () => api.get('/patients').then(r => r.data.slice(0, 6)),
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Total Patients"
              value={stats?.total ?? 0}
              sub="All registered"
              color="text-blue-600"
              icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard
              label="Waiting"
              value={stats?.waiting ?? 0}
              sub="In queue"
              color="text-amber-600"
              icon={<svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              label="In Progress"
              value={stats?.inProgress ?? 0}
              sub="Being seen"
              color="text-blue-600"
              icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            />
            <StatCard
              label="Revenue"
              value={`$${(stats?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
              sub={`$${(stats?.pendingRevenue ?? 0).toLocaleString()} pending`}
              color="text-green-600"
              icon={<svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { to: '/patients', label: 'Patient Registry', desc: 'View & manage all patients', bg: 'bg-blue-600', icon: '👥' },
          { to: '/kanban', label: 'Workflow Board', desc: 'Drag to update patient status', bg: 'bg-indigo-600', icon: '📋' },
          { to: '/billing', label: 'Billing', desc: 'Track charges & payments', bg: 'bg-green-600', icon: '💳' },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`${action.bg} text-white rounded-xl p-5 hover:opacity-90 transition-opacity`}
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="font-semibold">{action.label}</div>
            <div className="text-sm opacity-80 mt-0.5">{action.desc}</div>
          </Link>
        ))}
      </div>

      {/* Recent patients */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Patients</h2>
          <Link to="/patients" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {patientsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
              </div>
            ))
          ) : patients?.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No patients yet</div>
          ) : (
            patients?.map((p) => (
              <Link
                key={p.id}
                to={`/patients/${p.id}`}
                className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                  {p.firstName[0]}{p.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                  <div className="text-xs text-gray-500">MRN: {p.mrn} · {p.insurance || 'No insurance'}</div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
