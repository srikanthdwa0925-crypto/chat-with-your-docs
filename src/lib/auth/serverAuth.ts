// src/lib/auth/serverAuth.ts
import { createClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

export async function getAuthenticatedUser(): Promise<{ user: User | null; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, error: error?.message || 'Unauthorized: No active user session.' };
    }

    return { user };
  } catch (err: any) {
    return { user: null, error: err.message || 'Authentication error.' };
  }
}
