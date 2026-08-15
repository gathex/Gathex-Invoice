import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";
import { useToast } from "../ui/Toast";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { ThemeToggle } from "../ui/ThemeToggle";
import { GathexLogo } from "../ui/GathexLogo";
import { 
  Building2, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowLeft, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
  X
} from "lucide-react";

interface AuthViewProps {
  mode: "login" | "register" | "forgot";
}

export function AuthView({ mode: initialMode }: AuthViewProps) {
  const { navigate } = useRouter();
  const { 
    signInGoogle, 
    loginWithEmail, 
    signUpWithEmail, 
    resetPassword,
    loading: authLoading 
  } = useAuth();
  
  const toast = useToast();
  
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [email, setEmail] = useState(() => localStorage.getItem("gathex_remembered_email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberEmail, setRememberEmail] = useState(() => !!localStorage.getItem("gathex_remembered_email"));
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  // Password Validation Rules
  const passwordRequirements = [
    { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { label: "At least one uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
    { label: "At least one lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
    { label: "At least one number (0-9)", test: (p: string) => /[0-9]/.test(p) },
    { label: "At least one special character (!@#$%^&*)", test: (p: string) => /[^A-Za-z0-9]/.test(p) }
  ];

  const passedRequirements = passwordRequirements.filter(r => r.test(password)).length;
  const passwordScore = password ? Math.round((passedRequirements / passwordRequirements.length) * 100) : 0;

  const getPasswordStrengthLabel = () => {
    if (!password) return { label: "", color: "bg-slate-700" };
    if (passedRequirements <= 2) return { label: "Weak", color: "bg-rose-500" };
    if (passedRequirements <= 4) return { label: "Medium", color: "bg-amber-500" };
    return { label: "Strong", color: "bg-emerald-500" };
  };

  const getFriendlyErrorMessage = (code: string, originalMessage: string) => {
    switch (code) {
      case "auth/user-not-found":
        return "We couldn't find an account matching this email address. Please check your spelling or register a new account.";
      case "auth/wrong-password":
        return "Incorrect password entered. Please double-check your password and try again.";
      case "auth/invalid-credential":
        return "Invalid login credentials. Please verify your email and password.";
      case "auth/invalid-email":
        return "Please enter a valid email address format (e.g. user@company.com).";
      case "auth/too-many-requests":
        return "This account has been temporarily blocked due to multiple failed login attempts. Please reset your password or try again later.";
      case "auth/weak-password":
        return "The password is too weak. Please ensure it meets all complexity requirements.";
      case "auth/email-already-in-use":
        return "An account already exists with this email address. Please sign in instead.";
      case "auth/network-request-failed":
        return "Network connection issue. Please check your Internet connection and try again.";
      case "auth/operation-not-allowed":
        return "Email/Password sign-in is disabled in your Supabase console settings.";
      case "auth/unauthorized-domain":
        return "Domain authorization error: Please add your active domain to Supabase Console -> Authentication -> Settings -> Authorized domains.";
      default:
        return originalMessage || "An unexpected error occurred during authentication. Please try again.";
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();

    // Basic Validation
    if (!cleanEmail) {
      setError("Email address is required.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setError("Please enter a valid email address format.");
      return;
    }

    if (mode !== "forgot" && !password) {
      setError("Password is required.");
      return;
    }

    if (mode === "register") {
      if (!displayName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please ensure both fields are identical.");
        return;
      }
      if (passedRequirements < 3) {
        setError("Password does not meet minimum strength requirements.");
        return;
      }
    }

    // Save or clear remembered email
    if (rememberEmail) {
      localStorage.setItem("gathex_remembered_email", cleanEmail);
    } else {
      localStorage.removeItem("gathex_remembered_email");
    }

    setLocalLoading(true);
    try {
      if (mode === "login") {
        await loginWithEmail(cleanEmail, password);
        toast.success("Welcome Back!", "Successfully signed into your GATHEX workspace.");
        navigate("dashboard");
      } else if (mode === "register") {
        await signUpWithEmail(cleanEmail, password, displayName.trim());
        toast.success("Account Created!", "Welcome to GATHEX. Your partner workspace is ready.");
        navigate("dashboard");
      } else if (mode === "forgot") {
        await resetPassword(cleanEmail);
        setSuccessMsg("A password reset link has been sent to your email address.");
        toast.success("Reset Link Sent", "Check your email inbox for instructions.");
      }
    } catch (err: any) {
      console.error("Auth action error:", err);
      const friendlyMessage = getFriendlyErrorMessage(err.code, err.message);
      setError(friendlyMessage);
      toast.error("Authentication Error", friendlyMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLocalLoading(true);
    try {
      await signInGoogle();
      toast.success("Google Login Successful", "Signed in via Google Secure Auth.");
      navigate("dashboard");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        const friendlyMessage = getFriendlyErrorMessage(err.code, err.message);
        setError(friendlyMessage);
        toast.error("Google Authentication Failed", friendlyMessage);
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = authLoading || localLoading;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center font-sans relative px-4 py-12 select-none overflow-x-hidden transition-colors duration-300">
      
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none z-0" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none z-0" />

      {/* Floating Theme / Navigation controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-10">
        <ThemeToggle />
      </div>

      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={() => navigate("landing")}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-semibold py-2 px-3 rounded-xl bg-white dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md z-10 relative">
        <Card className="bg-white dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800/90 shadow-2xl overflow-hidden rounded-2xl transition-colors duration-300">
          <CardContent className="p-8 sm:p-10 space-y-6">
            
            {/* Header Brand */}
            <div className="flex flex-col items-center text-center space-y-3">
              <GathexLogo size={52} className="w-13 h-13 shadow-lg shadow-indigo-500/10" />
              <div className="space-y-1">
                <h2 className="text-2xl font-black font-display tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-100 dark:to-cyan-100 bg-clip-text text-transparent uppercase">
                  GATHEX <span className="font-light text-slate-500">INVOICE</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {mode === "login" && "Sign in to manage your GST tax ledger"}
                  {mode === "register" && "Create your partner workspace account"}
                  {mode === "forgot" && "Recover your account password"}
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === "login" 
                    ? "bg-primary-600 text-white shadow-md" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === "register" 
                    ? "bg-primary-600 text-white shadow-md" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs flex items-start gap-2.5 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              
              {/* Full Name for Registration */}
              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input
                      type="text"
                      placeholder="e.g. Kesav Kumar"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isLoading}
                      required
                      className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 rounded-xl w-full"
                    />
                  </div>
                </div>
              )}

              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 rounded-xl w-full"
                  />
                </div>
              </div>

              {/* Password Input */}
              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); setError(null); setSuccessMsg(null); }}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="pl-10 pr-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 rounded-xl w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Password Strength Meter for Registration */}
              {mode === "register" && password && (
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password Strength</span>
                    <span className={`font-semibold ${getPasswordStrengthLabel().color.replace('bg-', 'text-')}`}>
                      {getPasswordStrengthLabel().label}
                    </span>
                  </div>
                  
                  {/* Strength Bar */}
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getPasswordStrengthLabel().color}`} 
                      style={{ width: `${passwordScore}%` }}
                    />
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-1 gap-1 pt-1">
                    {passwordRequirements.map((req, idx) => {
                      const met = req.test(password);
                      return (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                          {met ? (
                            <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <X className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={met ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}>
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Confirm Password for Registration */}
              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="pl-10 pr-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 rounded-xl w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember Email Checkbox for Sign In */}
              {mode === "login" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="rememberEmail"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="rememberEmail" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer select-none">
                    Remember my email
                  </label>
                </div>
              )}

              {/* Action Button */}
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary-600/15 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Request...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === "login" && "Sign In to Workspace"}
                      {mode === "register" && "Create Account"}
                      {mode === "forgot" && "Send Reset Link"}
                    </span>
                  </>
                )}
              </Button>
            </form>

            {/* Social Authentication */}
            {mode !== "forgot" && (
              <div className="space-y-4">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                  <span className="flex-shrink mx-3 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Or continue with</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-950/90 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.45 1.615l2.42-2.42C17.29 1.83 14.92 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.9 0 9.81-4.15 9.81-10 0-.67-.06-1.3-.18-1.885H12.24z"/>
                  </svg>
                  Google Account
                </button>
              </div>
            )}

            {/* Switcher Footer */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-semibold pt-2">
              {mode === "login" && (
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("register"); setError(null); setSuccessMsg(null); }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline font-bold transition-all cursor-pointer"
                  >
                    Register here
                  </button>
                </p>
              )}
              {mode === "register" && (
                <p>
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(null); setSuccessMsg(null); }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline font-bold transition-all cursor-pointer"
                  >
                    Sign in here
                  </button>
                </p>
              )}
              {mode === "forgot" && (
                <p>
                  Remembered your password?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(null); setSuccessMsg(null); }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline font-bold transition-all cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </p>
              )}
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Trust Footer */}
      <div className="mt-8 flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        <ShieldCheck className="w-4 h-4 text-indigo-500" />
        <span>Enterprise SSL & Supabase Encrypted Vault</span>
      </div>

    </div>
  );
}
