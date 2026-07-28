import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import compatibleWithStravaImg from '@/assets/strava/compatible-with-strava.png';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, LogIn, Activity, Mountain, Timer, Flame, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LoginPage = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      setSubmitting(false);
      if (error) { setError(error); return; }
      setMessage('Check your email for a link to reset your password.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setSubmitting(false);
      setError('Please enter your name.');
      return;
    }

    const fn = mode === 'login'
      ? () => signIn(email, password)
      : () => signUp(email, password, displayName);
    const { error } = await fn();
    setSubmitting(false);

    if (error) {
      if (error.includes('Invalid login')) setError('Incorrect email or password.');
      else if (error.includes('already registered')) setError('This email is already registered.');
      else setError(error);
      return;
    }

    if (mode === 'signup') {
      // Save display name to localStorage to be applied after email confirmation
      localStorage.setItem('treningslogg_pending_username', displayName.trim());
      setMessage('Check your email to confirm your account. You can log in after confirmation.');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-72 h-72 rounded-full bg-energy/8 blur-[80px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[15%] right-[8%] w-64 h-64 rounded-full bg-accent/8 blur-[70px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-[50%] left-[60%] w-48 h-48 rounded-full bg-energy/5 blur-[60px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        
        {/* Floating sport icons */}
        <div className="absolute top-[15%] right-[15%] opacity-[0.06]" style={{ animation: 'float-icon 8s ease-in-out infinite' }}>
          <Activity className="w-16 h-16" />
        </div>
        <div className="absolute bottom-[25%] left-[10%] opacity-[0.06]" style={{ animation: 'float-icon 10s ease-in-out infinite', animationDelay: '2s' }}>
          <Mountain className="w-20 h-20" />
        </div>
        <div className="absolute top-[60%] right-[8%] opacity-[0.06]" style={{ animation: 'float-icon 7s ease-in-out infinite', animationDelay: '4s' }}>
          <Timer className="w-14 h-14" />
        </div>
        <div className="absolute top-[30%] left-[8%] opacity-[0.06]" style={{ animation: 'float-icon 9s ease-in-out infinite', animationDelay: '1s' }}>
          <Flame className="w-12 h-12" />
        </div>
      </div>

      <div className="w-full max-w-sm space-y-6 relative z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-energy/20 rounded-3xl blur-xl scale-125" />
            <img src="/app-icon-512.png" alt="Treningslogg" className="relative w-20 h-20 rounded-2xl shadow-xl ring-2 ring-white/10" />
          </div>
          <div className="text-center">
            <h1 className="font-display font-bold text-3xl tracking-tight">
              Trenings<span className="text-gradient-energy">appen</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-[240px] mx-auto leading-relaxed">
              {mode === 'signup' && 'Start your training journey today'}
              {mode === 'forgot' && "We'll help you get back on track"}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-energy/5 to-transparent rounded-2xl" />
          <form onSubmit={handleSubmit} className="relative glass-card rounded-2xl p-5 space-y-4 border border-border/50">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="pl-10 bg-background/50"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="pl-10 bg-background/50"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-background/50"
                    required
                    minLength={6}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="text-[11px] text-muted-foreground">At least 6 characters</p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-success/10 text-[hsl(var(--success))] text-sm rounded-lg px-3 py-2">
                {message}
              </div>
            )}

            <Button type="submit" className="w-full gradient-energy text-primary-foreground h-11 text-sm font-semibold shadow-lg shadow-energy/20" disabled={submitting}>
              {submitting ? (
                <span className="animate-pulse">Please wait…</span>
              ) : (
                <>
                  {mode === 'login' && <><LogIn className="w-4 h-4 mr-1.5" /> Log in</>}
                  {mode === 'signup' && <><UserPlus className="w-4 h-4 mr-1.5" /> Create account</>}
                  {mode === 'forgot' && <><ArrowRight className="w-4 h-4 mr-1.5" /> Send reset link</>}
                </>
              )}
            </Button>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
              >
                Forgot password?
              </button>
            )}
          </form>
        </div>

        {/* Switch mode */}
        <div className="text-center text-sm text-muted-foreground pb-4">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className="text-[hsl(var(--energy))] font-semibold hover:underline">
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="text-[hsl(var(--energy))] font-semibold hover:underline">
                Log in
              </button>
            </>
          )}
        </div>

        {/* Compatible with Strava */}
        <div className="flex justify-center pb-6 opacity-60">
          <img src={compatibleWithStravaImg} alt="Compatible with Strava" className="h-6 dark:invert" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
