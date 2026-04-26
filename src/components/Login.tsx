import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from './ClayUI';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      if (error) throw error;
      // If successful, the auth listener in SupabaseContext will update the state
    } catch (err: any) {
      setError(err.message || "Authentication failed. Invalid credentials.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 selection:bg-primary/20 overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="glass-card p-10 sm:p-12 space-y-10 relative overflow-hidden shadow-2xl border-white/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-premium rotate-3 hover:rotate-0 transition-transform duration-500">
              <ShieldCheck className="text-primary w-10 h-10" />
            </div>
            <div>
              <h1 className="font-headline text-4xl italic text-primary leading-none tracking-tight">Access Control</h1>
              <p className="label-caps !text-primary/40 mt-2">Sumi Tailoring Institute</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="label-caps !text-primary ml-1">Administrator Email</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors" />
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full input-premium pl-16 pr-6 py-5 outline-none transition-all text-primary rounded-3xl"
                  placeholder="admin@sumitailoring.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label-caps !text-primary ml-1">Secure Key</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors" />
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full input-premium pl-16 pr-16 py-5 outline-none transition-all text-primary rounded-3xl"
                  placeholder="Password"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-2xl bg-error/5 border border-error/10 text-error text-[10px] uppercase tracking-widest font-bold text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button 
              type="submit" 
              className="w-full py-6 flex items-center justify-center gap-3 rounded-[2rem] shadow-xl shadow-primary/20"
              variant="primary"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="font-headline italic text-xl">Verifying...</span>
                </>
              ) : (
                <>
                  <span className="font-headline italic text-xl">Grant Access</span>
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="font-body text-[10px] text-primary/30 italic">
              Encrypted Session Management Active
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
