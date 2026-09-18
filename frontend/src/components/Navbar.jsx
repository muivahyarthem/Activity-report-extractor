import React from 'react';
import { FileText, LogIn, LogOut, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { apiFetch } from '../api';

export default function Navbar({ authStatus, onRefreshAuth, onLogout }) {
  const isAuth = authStatus?.is_authenticated;
  const primaryUser = authStatus?.primary_user;

  const handleLogin = (accountType = 'primary') => {
    apiFetch(`/api/auth/google/login?account_type=${accountType}`)
      .then(res => res.json())
      .then(data => {
        if (data.auth_url) window.location.href = data.auth_url;
        else if (data.error) alert(`Google Auth Notice: ${data.error}`);
      })
      .catch(err => alert("Failed to contact auth server: " + err.message));
  };

  return (
    <header className="bg-[#1a3a5c] border-b border-[#0f2640] sticky top-0 z-30">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-white/80 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-white tracking-tight">
              Activity Report System
            </span>
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="hidden sm:inline text-sm text-white/60">
              Document Processing &amp; Export
            </span>
          </div>
        </div>

        {/* Auth Controls */}
        <div className="flex items-center gap-2">
          {isAuth ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/25 px-3 py-1.5 rounded text-sm text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-300 shrink-0" />
                <span className="truncate max-w-[160px]">{primaryUser?.email || 'Google Connected'}</span>
              </div>
              <button
                onClick={() => handleLogin('secondary')}
                className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded border border-white/20 transition-colors"
                title="Connect another Google account"
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Switch Account</span>
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors"
                title="Disconnect Google Account"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-1.5 text-sm text-white/50">
                <AlertCircle className="w-4 h-4" />
                Google not connected
              </span>
              <button
                onClick={() => handleLogin('primary')}
                className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded bg-white text-[#1a3a5c] hover:bg-gray-100 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign in with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
