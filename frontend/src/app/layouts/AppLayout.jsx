import { createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import TopBar from '../../components/TopBar.jsx';
import ToastContainer, { useToast } from '../../components/Toast.jsx';

const ToastContext = createContext();

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}

export default function AppLayout() {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
        <ToastContainer
          toasts={toast.toasts}
          onRemove={toast.removeToast}
        />
      </div>
    </ToastContext.Provider>
  );
}