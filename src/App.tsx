import React, { useState, useEffect } from 'react';
import { Scissors, Camera, RefreshCw, Home, Users, Package, UserCircle, Briefcase, Settings, GraduationCap, Ruler, X, LifeBuoy, Moon, Sun } from 'lucide-react';
import { Card, Button } from './components/ClayUI';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

import { Dashboard } from './components/Dashboard';
import { Students } from './components/Students';
import { Stock } from './components/Stock';
import { Customers } from './components/Customers';
import { Works } from './components/Works';
import { Courses } from './components/Courses';
import { SettingsPage } from './components/SettingsPage';
import { useFirebase } from './context/FirebaseContext';
import { Login } from './components/Login';
import { LogOut } from 'lucide-react';

export default function App() {
  const { user, loading } = useFirebase();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [triggerScan, setTriggerScan] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('tailor_auth_session') === 'true';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('tailor_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tailor_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tailor_theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (activeTab !== 'students') {
      setSelectedStudentId(null);
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-primary animate-spin" />
          <p className="font-headline text-2xl italic text-primary">Loading Suite...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={cn(
        "min-h-screen transition-all duration-1000 flex justify-center selection:bg-primary/20",
        theme === 'light' 
          ? "bg-[radial-gradient(circle_at_top_right,_#fff5f9_0%,_#ffe4ee_50%,_#fff0f6_100%)]" 
          : "bg-[radial-gradient(circle_at_top_right,_#1a0108_0%,_#0a0a0a_100%)]"
      )}>
        <Login onLogin={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('tailor_auth_session');
    localStorage.removeItem('tailor_auth_timestamp');
    setIsAuthenticated(false);
  };

  const handleStudentClick = (student: any) => {
    setSelectedStudentId(student.id);
    setActiveTab('students');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return (
        <Dashboard 
          onScanClick={() => { setActiveTab('customers'); setTriggerScan(true); }} 
          onStudentClick={handleStudentClick}
        />
      );
      case 'students': return <Students initialSelectedId={selectedStudentId} />;
      case 'courses': return <Courses />;
      case 'inventory': return <Stock />;
      case 'customers': return <Customers triggerScan={triggerScan} onScanHandled={() => setTriggerScan(false)} />;
      case 'works': return <Works />;
      case 'settings': return <SettingsPage theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />;
      default: return (
        <Dashboard 
          onScanClick={() => { setActiveTab('customers'); setTriggerScan(true); }} 
          onStudentClick={handleStudentClick}
        />
      );
    }
  };

  return (
    <div className={cn(
      "min-h-screen transition-all duration-1000 flex justify-center selection:bg-primary/20",
      theme === 'light' 
        ? "bg-[radial-gradient(circle_at_top_right,_#fff5f9_0%,_#ffe4ee_50%,_#fff0f6_100%)]" 
        : "bg-[radial-gradient(circle_at_top_right,_#1a0108_0%,_#0a0a0a_100%)]"
    )}>
      <div className="w-full max-w-[500px] min-h-screen relative overflow-x-hidden bg-transparent">
        {/* TopAppBar */}
        <header className="bg-white/30 dark:bg-black/40 backdrop-blur-[60px] saturate-[250%] border-b border-white/40 dark:border-white/10 sticky top-0 z-50 h-32 flex items-center transition-all">
          <div className="flex justify-between items-center w-full px-10">
            <div className="flex items-center gap-6 overflow-hidden">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="w-16 h-16 glass-card text-primary flex items-center justify-center shrink-0 border-white/80 shadow-premium"
              >
                <span className="material-symbols-outlined text-4xl font-black">menu</span>
              </button>
                <div className="flex flex-col">
                  <h1 className="font-headline text-5xl italic text-primary leading-none tracking-tighter truncate drop-shadow-sm">Sumi</h1>
                  <p className="label-caps text-[9px] mt-1">Tailoring Institute</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleTheme}
                className="w-12 h-12 glass-card flex items-center justify-center shrink-0 border-white/60"
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === 'light' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={cn(
                   "w-12 h-12 glass-card p-1 transition-all active:scale-90 shrink-0 border-white/60",
                   activeTab === 'settings' && "ring-2 ring-primary/20"
                )}
              >
                <img 
                   alt="User" 
                   className="w-full h-full rounded-full object-cover" 
                   src={user.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuA_Xnwc6gWP0vxwRGyvpsMiXwU9wAI3kUFij5b8bb9n7kxIY1Rf3rxl9O6NqYnb6nyPVLlxUlgP4HqD607UN5Wq9Ag8MdCOBp67EDWDIcvajSXFCSKvm1iaMgOvbhhAL3D2tfaeHZnQqBWuEClSwSLGxeenr-h0NA-N7ryN2dKktD45OLpslrwsUis2pF5KzTr4XtzuaSyLWEjoyN7-qat2VMkqPb6X9gZ_2JrwI3Krqwe02WdQjFHalHLaACVW4tXysN1EGHszQ3ex"}
                />
              </button>
            </div>
          </div>
        </header>
  
        {/* Main Content */}
        <main className="px-4 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
  
        <nav className="nav-glass mb-4">
          <NavTab 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<Home className="w-6 h-6" />} 
          />
          <NavTab 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
            icon={<Package className="w-6 h-6" />} 
          />
          <NavTab 
            active={activeTab === 'courses'} 
            onClick={() => setActiveTab('courses')} 
            icon={<GraduationCap className="w-6 h-6" />} 
          />
          <NavTab 
            active={activeTab === 'students'} 
            onClick={() => setActiveTab('students')} 
            icon={<Users className="w-6 h-6" />} 
          />
          <NavTab 
            active={activeTab === 'customers'} 
            onClick={() => setActiveTab('customers')} 
            icon={<UserCircle className="w-6 h-6" />} 
          />
        </nav>
 
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-primary/20 backdrop-blur-xl z-[100]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 35, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[340px] bg-white/80 dark:bg-black/80 backdrop-blur-[60px] saturate-[200%] z-[110] border-r border-white/80 p-12 flex flex-col shadow-[20px_0_80px_rgba(255,27,107,0.15)]"
            >
              <div className="flex justify-between items-center mb-20">
                <div className="flex flex-col">
                  <h2 className="font-headline text-5xl italic text-primary tracking-tighter drop-shadow-sm">Sumi</h2>
                  <p className="label-caps text-[9px] mt-2">Sumi Tailoring Institute</p>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="w-14 h-14 glass-card flex items-center justify-center hover:bg-primary/5 border-white/80 shadow-premium">
                  <X className="w-8 h-8 text-primary" />
                </button>
              </div>
 
              <nav className="flex-1 space-y-8">
                <SidebarItem icon={<Home className="w-7 h-7" />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={<GraduationCap className="w-7 h-7" />} label="Courses" active={activeTab === 'courses'} onClick={() => { setActiveTab('courses'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={<Users className="w-7 h-7" />} label="Students" active={activeTab === 'students'} onClick={() => { setActiveTab('students'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={<Briefcase className="w-7 h-7" />} label="Works" active={activeTab === 'works'} onClick={() => { setActiveTab('works'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={<Package className="w-7 h-7" />} label="Inventory" active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={<UserCircle className="w-7 h-7" />} label="Customers" active={activeTab === 'customers'} onClick={() => { setActiveTab('customers'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={<Settings className="w-7 h-7" />} label="Settings" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} />
              </nav>
 
 
              <div className="pt-12 border-t border-primary/20">
                <a 
                  href={`mailto:support@sumitailoring.com?subject=[Sumi Tailoring Support] Issue Report&body=Please describe the issue you are experiencing:%0D%0A%0D%0A[Your description here]%0D%0A%0D%0A---%0D%0AUser: ${user.email}%0D%0ADate: ${new Date().toLocaleString()}`}
                  className="w-full btn-premium py-6 flex items-center justify-center gap-4 text-sm"
                >
                  <LifeBuoy className="w-6 h-6" />
                  Support Hub
                </a>
                <button 
                  onClick={handleLogout}
                  className="w-full mt-4 p-6 rounded-full border border-error/20 text-error flex items-center justify-center gap-4 font-headline italic text-xl hover:bg-error/5 transition-all"
                >
                  <LogOut className="w-6 h-6" />
                  Secure Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


        {/* Ambient Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-[100] bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
        
        {/* Print Area */}
        <div id="print-area"></div>
      </div>
    </div>
  );
}

interface NavTabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-6 p-5 rounded-[2rem] transition-all duration-500 active:scale-95",
        active 
          ? "bg-primary/10 text-primary border border-primary/30 shadow-premium backdrop-blur-xl" 
          : "text-[#800033]/60 hover:bg-primary/5 hover:text-primary border border-transparent"
      )}
    >
      <div className={cn(
        "w-10 h-10 flex items-center justify-center transition-transform duration-500",
        active && "scale-110"
      )}>
        {icon}
      </div>
      <span className="font-headline text-2xl italic tracking-tighter">{label}</span>
    </button>
  );
};

const NavTab: React.FC<NavTabProps> = ({ active, onClick, icon }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "nav-item",
        active && "active"
      )}
    >
      {icon}
    </button>
  );
};

const NavTabTop: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-2 font-headline text-lg transition-all duration-300 italic tracking-tight",
        active ? "text-primary liquid-glass liquid-glass-active" : "text-primary/30 hover:text-primary"
      )}
    >
      {label}
    </button>
  );
};
