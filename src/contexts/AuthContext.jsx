import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Master loading state

  // console.log(`AuthProvider Render: loading=${loading}, user=${user?.id}`);

  const fetchUserProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return null; // Return null if no user
    }
    // console.log(`AuthProvider: Fetching profile for user: ${currentUser.id}`);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (error) {
        console.error('AuthProvider: Error fetching profile:', error.message);
        return null; // Return null on error
      }
      // console.log('AuthProvider: Profile fetched:', data);
      return data; // Return profile data
    } catch (e) {
      console.error('AuthProvider: Exception fetching profile:', e.message);
      return null; // Return null on exception
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // console.log('AuthProvider: Main useEffect triggered.');

    // This function handles setting all auth-related states
    const handleAuthState = async (session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      // console.log(`AuthProvider: handleAuthState - User set to: ${currentUser?.id}`);

      if (currentUser) {
        const userProfile = await fetchUserProfile(currentUser);
        if (mounted) setProfile(userProfile);
      } else {
        if (mounted) setProfile(null);
      }
      
      // Crucially, set loading to false AFTER all async operations related to this auth state are done.
      if (mounted) {
        setLoading(false);
        // console.log('AuthProvider: handleAuthState - setLoading(false)');
      }
    };

    // Get initial session state
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('AuthProvider: getSession() completed. Initial session user:', session?.user?.id);
      handleAuthState(session); // Process this initial session
    }).catch(err => {
        if(mounted) {
            console.error("AuthProvider: Error in initial getSession():", err.message);
            setUser(null);
            setProfile(null);
            setLoading(false); // Ensure loading is false even on error
        }
    });

    // Subscribe to future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // console.log(`AuthProvider: onAuthStateChange - Event: ${_event}, New session user: ${session?.user?.id}`);
        // We call handleAuthState for every change, including the initial one if it fires first.
        // The setLoading(false) inside handleAuthState will ensure it's called.
        handleAuthState(session);
      }
    );

    return () => {
      mounted = false;
      // console.log('AuthProvider: Main useEffect UNMOUNTING, unsubscribing.');
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]); // fetchUserProfile is stable

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    refreshProfile: useCallback(async () => {
      if (user) {
        const refreshedProfile = await fetchUserProfile(user);
        setProfile(refreshedProfile);
      }
    }, [user, fetchUserProfile]),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};