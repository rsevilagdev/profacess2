import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { colaborador, loading } = useProfarmaAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-white/10 border-t-[hsl(160,50%,40%)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!colaborador) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={`transition-all duration-300 ${collapsed ? 'ml-[72px]' : 'ml-64'}`}>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}