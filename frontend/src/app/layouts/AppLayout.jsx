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
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <TopBar />
          <div className="content">
            {/* Nested route content renders here */}
            <Outlet />
          </div>
        </div>
        <ToastContainer
          toasts={toast.toasts}
          onRemove={toast.removeToast}
        />
      </div>
    </ToastContext.Provider>
  );
}
