import React, { useState, useEffect } from 'react';
import { Card, Button } from './ClayUI';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useSupabase } from '../context/SupabaseContext';

export interface SettingsPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ theme, toggleTheme, onLogout }) => {
  const { user } = useSupabase();
  const isDarkMode = theme === 'dark';

  return (
    <div className="p-6 flex flex-col gap-8 relative min-h-[calc(100vh-200px)] pb-32">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center bg-white/50">
            <span className="material-symbols-outlined text-primary text-2xl">settings</span>
          </div>
          <div>
            <h2 className="font-headline text-3xl tracking-tight text-primary leading-none italic">Settings</h2>
            <p className="label-caps !text-primary/40 mt-1">System Configuration</p>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <Card className="p-6 glass-card flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full glass-card-inset overflow-hidden bg-primary/5 flex items-center justify-center">
               {user?.user_metadata?.avatar_url || (user as any)?.photoURL ? (
                <img src={user?.user_metadata?.avatar_url || (user as any)?.photoURL} alt={user?.user_metadata?.full_name || (user as any)?.displayName || 'User'} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary/40 text-3xl">person</span>
              )}
            </div>
            <div>
              <h3 className="font-headline text-xl tracking-tight text-primary italic">{user?.displayName || 'Sumi Institute User'}</h3>
              <p className="font-mono text-[10px] text-primary/40 tracking-wider font-bold">{user?.email || 'anonymous@sumitailoring.com'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Appearance Section */}
      <div className="flex flex-col gap-4">
        <h3 className="label-caps !text-primary/40 px-2">Appearance</h3>
        <Card className="p-6 glass-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full glass-card-inset flex items-center justify-center bg-primary/5">
              <span className="material-symbols-outlined text-primary">
                {isDarkMode ? 'dark_mode' : 'light_mode'}
              </span>
            </div>
            <div>
              <p className="font-headline text-lg tracking-tight text-primary italic">Dark Mode</p>
              <p className="font-body text-[10px] text-primary/40">Adjust UI contrast for low light</p>
            </div>
          </div>
          <button 
            onClick={toggleTheme}
            className={cn(
              "w-14 h-8 rounded-full glass-card-inset relative transition-all duration-300",
              isDarkMode ? "bg-primary/20" : "bg-primary/5"
            )}
          >
            <motion.div 
              animate={{ x: isDarkMode ? 24 : 4 }}
              className="absolute top-1 w-6 h-6 rounded-full bg-primary shadow-lg"
            />
          </button>
        </Card>

        <h3 className="label-caps !text-primary/40 px-2">System Status</h3>
        <Card className="p-6 glass-card flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">cloud_done</span>
              </div>
              <div>
                <p className="font-headline text-lg tracking-tight text-primary italic">Connected to Supabase</p>
                <p className="font-body text-[10px] text-primary/40">Live cloud database active</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* App Info */}
      <div className="flex flex-col items-center gap-2 py-8 opacity-20">
        <h1 className="font-headline text-xl italic text-primary leading-none">Sumi Tailoring Institute</h1>
        <p className="font-mono text-[8px] uppercase tracking-[0.3em] font-bold">Version 1.0.0 Production</p>
      </div>

      {/* Support Section */}
      <div className="pt-8 border-t border-primary/5">
        <a 
          href="mailto:support@sumitailoring.com?subject=[App Support] Issue Report - Sumi Tailoring Institute&body=Please describe the problem you are facing:"
          className="w-full btn-premium bg-primary text-white py-6 flex items-center justify-center gap-4 font-headline text-2xl italic tracking-tight shadow-xl shadow-primary/20"
        >
          <span className="material-symbols-outlined text-3xl">help</span>
          Get Help & Support
        </a>
        <p className="text-center mt-4 font-label text-[10px] text-primary/30 uppercase tracking-[0.2em] font-bold">
          Sumi Tailoring Support Team
        </p>
      </div>

      {/* Logout Option */}
      <div className="pt-8">
        <button 
          onClick={onLogout}
          className="w-full p-6 rounded-full border border-error/20 text-error flex items-center justify-center gap-4 font-headline italic text-xl hover:bg-error/5 transition-all"
        >
          <span className="material-symbols-outlined text-2xl">logout</span>
          Sign Out of System
        </button>
      </div>
    </div>
  );
};
