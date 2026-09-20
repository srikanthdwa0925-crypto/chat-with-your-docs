'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Shield, Cpu, Database, Sun, Moon } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        setFullName(user.user_metadata?.full_name || '');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // Ignored
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account preferences, themes, and AI parameters
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">User Profile</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'Loading...'}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-sm cursor-not-allowed outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Managed via Supabase Auth</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Theme Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Sun className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Appearance</h2>
          </div>

          <div className="flex items-center justify-between max-w-md">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Interface Theme</p>
              <p className="text-xs text-slate-500">Toggle between light and dark themes</p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* AI & RAG Configuration Overview */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Cpu className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">AI Engine & RAG Configuration</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-1">
              <span className="text-slate-400 font-medium">Active LLM Provider</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Google Gemini / OpenAI (Configurable)
              </p>
              <p className="text-[11px] text-slate-500">Selected dynamically via server environment</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-1">
              <span className="text-slate-400 font-medium">Vector Dimension</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                768 dimensions (Gemini text-embedding-004)
              </p>
              <p className="text-[11px] text-slate-500">Indexed via PostgreSQL HNSW</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-1">
              <span className="text-slate-400 font-medium">Retrieval Strategy</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Top-5 Cosine Similarity Search
              </p>
              <p className="text-[11px] text-slate-500">Threshold: 0.20 (Grounded)</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-1">
              <span className="text-slate-400 font-medium">Grounding Rule</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Strict Anti-Hallucination Fallback
              </p>
              <p className="text-[11px] text-slate-500">Untrusted document content encapsulation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
