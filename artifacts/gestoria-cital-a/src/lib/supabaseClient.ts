export const supabase = {
  auth: {
    signInWithOAuth: async () => ({ data: null, error: null }),
    signInWithOtp: async () => ({ data: null, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  },
};
