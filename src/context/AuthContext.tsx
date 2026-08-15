import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../supabase/config";
import { UserProfile, BusinessDetails } from "../types";
import { useTheme } from "./ThemeContext";

export interface CompatibleUser {
  id: string;
  uid: string;
  email?: string;
  user_metadata?: Record<string, any>;
  [key: string]: any;
}

interface AuthContextType {
  user: CompatibleUser | null;
  profile: UserProfile | null;
  activeBusiness: BusinessDetails | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setActiveBusiness: (business: BusinessDetails | null) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CompatibleUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeBusiness, setActiveBusinessState] = useState<BusinessDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const fetchUserProfile = async (userId: string, userEmail: string, userMetadata: any) => {
    try {
      const { data: profileRow, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", error);
      }

      const userProfile: UserProfile = {
        uid: userId,
        email: profileRow?.email || userEmail || "",
        displayName: profileRow?.display_name || userMetadata?.full_name || userMetadata?.display_name || userEmail?.split("@")[0] || "User",
        photoURL: profileRow?.photo_url || userMetadata?.avatar_url || "",
        createdAt: profileRow?.created_at ? new Date(profileRow.created_at) : new Date(),
        updatedAt: profileRow?.updated_at ? new Date(profileRow.updated_at) : new Date(),
        activeBusinessId: profileRow?.active_business_id || "",
        themePreference: profileRow?.theme_preference
      };

      setProfile(userProfile);

      if (userProfile.themePreference) {
        setTheme(userProfile.themePreference);
      }

      // Load user's businesses
      const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_uid', userId)
        .eq('is_archived', false);

      if (bizError) {
        console.error("Error fetching businesses:", bizError);
      }

      if (businesses && businesses.length > 0) {
        let currentBiz = userProfile.activeBusinessId
          ? businesses.find(b => b.id === userProfile.activeBusinessId)
          : null;

        if (!currentBiz) {
          currentBiz = businesses[0];
          // Persist the first business as active
          await supabase
            .from('profiles')
            .update({ active_business_id: currentBiz.id })
            .eq('id', userId);
        }

        setActiveBusinessState({
          id: currentBiz.id,
          ownerUid: currentBiz.owner_uid,
          name: currentBiz.name,
          tradeName: currentBiz.trade_name || "",
          invoiceTheme: currentBiz.invoice_theme || "modern",
          gstin: currentBiz.gstin || "",
          email: currentBiz.email || "",
          phone: currentBiz.phone || "",
          website: currentBiz.website || "",
          address: currentBiz.address || { street: "", city: "", state: "", postalCode: "", country: "India" },
          logoUrl: currentBiz.logo_url || "",
          bankDetails: currentBiz.bank_details || { accountName: "", accountNumber: "", bankName: "", ifsc: "", branch: "" },
          upiId: currentBiz.upi_id || "",
          pan: currentBiz.pan || "",
          createdAt: new Date(currentBiz.created_at),
          updatedAt: new Date(currentBiz.updated_at)
        });
      } else {
        setActiveBusinessState(null);
      }
    } catch (err) {
      console.error("Error loading user profile & business:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        const compUser: CompatibleUser = {
          ...session.user,
          uid: session.user.id
        };
        setUser(compUser);
        fetchUserProfile(session.user.id, session.user.email || "", session.user.user_metadata).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setActiveBusinessState(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const compUser: CompatibleUser = {
          ...session.user,
          uid: session.user.id
        };
        setUser(compUser);
        await fetchUserProfile(session.user.id, session.user.email || "", session.user.user_metadata);
      } else {
        setUser(null);
        setProfile(null);
        setActiveBusinessState(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google Sign In Error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      console.error("[AuthContext] Email sign-in failed:", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            full_name: displayName
          }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("[AuthContext] Registration failed:", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign Out Error:", error);
    } finally {
      setUser(null);
      setProfile(null);
      setActiveBusinessState(null);
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
    } catch (error) {
      console.error("Reset Password Error:", error);
      throw error;
    }
  };

  const setActiveBusiness = (business: BusinessDetails | null) => {
    setActiveBusinessState(business);
    if (user?.id) {
      supabase
        .from('profiles')
        .update({ active_business_id: business ? business.id : null })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error("Error setting active business:", error);
        });
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id, user.email || "", user.user_metadata);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      activeBusiness, 
      loading, 
      signInGoogle, 
      loginWithEmail,
      signUpWithEmail,
      logout, 
      resetPassword,
      setActiveBusiness,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
