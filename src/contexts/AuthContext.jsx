import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); 

  // console.log(`AuthProvider Render: loading=${loading}, user=${user?.id}`);

  const fetchUserProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return null; 
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
        setProfile(null);
        return null;
      } else {
        // console.log('AuthProvider: Profile fetched:', data);
        setProfile(data);
        return data; 
      }
    } catch (e) {
      console.error('AuthProvider: Exception fetching profile:', e.message);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // console.log('AuthProvider: Main useEffect for auth state - MOUNTED');
    setLoading(true); 
    // console.log('AuthProvider: Main useEffect - setLoading(true)');

    const handleAuthProcessing = async (session) => {
      if (!mounted) return;
      // console.log(`AuthProvider: handleAuthProcessing - Session user: ${session?.user?.id}`);
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setProfile(null);
      }
      
      if (mounted) {
        setLoading(false); 
        // console.log('AuthProvider: handleAuthProcessing - setLoading(false) - Auth check fully complete.');
      }
    };
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('AuthProvider: getSession() initial check completed. Session user:', session?.user?.id);
      handleAuthProcessing(session);
    }).catch(error => {
      if (mounted) {
        console.error("AuthProvider: Error in initial getSession():", error.message);
        setUser(null);
        setProfile(null);
        setLoading(false); 
        // console.log('AuthProvider: getSession() ERROR - setLoading(false)');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // console.log(`AuthProvider: onAuthStateChange - Event: ${_event}, Session user: ${session?.user?.id}`);
        handleAuthProcessing(session);
      }
    );

    return () => {
      mounted = false;
      // console.log('AuthProvider: Main useEffect - UNMOUNTING, unsubscribing.');
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    refreshProfile: useCallback(async () => {
      if (user) {
        // console.log('AuthProvider: refreshProfile called.');
        setLoading(true); 
        await fetchUserProfile(user);
        setLoading(false);
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