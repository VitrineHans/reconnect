import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  push_token: string | null;
  onboarding_answers: Record<string, unknown> | null;
}

export function useProfile(
  session: Session | null,
): { profile: Profile | null; profileLoading: boolean; refetch: () => void } {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = async () => {
    if (!session?.user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, push_token, onboarding_answers')
      .eq('id', session.user.id)
      .single();
    if (!error) setProfile(data);
    setProfileLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [session?.user?.id]);

  return { profile, profileLoading, refetch: fetchProfile };
}
