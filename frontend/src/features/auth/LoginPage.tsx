import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/common'
import { useAuthStore } from '@/app/store/useAuthStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { UserRole } from '@/types/database'

export const LoginPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setDemoUser } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Redirect destination after login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  const handleRoleRedirect = (role: UserRole) => {
    if (from && from !== '/login') {
      navigate(from, { replace: true })
      return
    }

    if (role === 'BOARDER') {
      navigate('/portal/my-meals', { replace: true })
    } else if (role === 'APPLICANT') {
      navigate('/portal/my-application', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      if (!isSupabaseConfigured) {
        // Fallback for development if keys aren't configured yet
        setDemoUser('SUPER_ADMIN')
        handleRoleRedirect('SUPER_ADMIN')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMessage(error.message === 'Invalid login credentials' 
          ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' 
          : error.message)
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Fetch role from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        const userRole = (profile?.role as UserRole) || 'BOARDER'
        handleRoleRedirect(userRole)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'লগইন প্রক্রিয়া ব্যর্থ হয়েছে।'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickDemoLogin = (role: UserRole) => {
    setDemoUser(role)
    handleRoleRedirect(role)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative selection:bg-primary-500/20">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Logo and Brand Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 p-0.5 shadow-xl shadow-primary-500/30 mx-auto flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t('app.title')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('app.subtitle')}
          </p>
        </div>

        {/* Login Form Card */}
        <Card variant="glass" className="border-slate-800 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">অ্যাকাউন্টে প্রবেশ করুন</CardTitle>
            <CardDescription>
              আপনার নিবন্ধিত ইমেইল ও পাসওয়ার্ড দিয়ে সাইন-ইন করুন
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Input
                label="ইমেইল বা ইউজারনেম"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <div className="space-y-1">
                <Input
                  label="পাসওয়ার্ড"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-primary-600 focus:ring-primary-500"
                  />
                  <span>মনে রাখুন (Remember me)</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </Link>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                সাইন ইন করুন
              </Button>

              <div className="text-center text-xs text-slate-400 pt-1">
                হোস্টেলে সিট খুঁজছেন?{' '}
                <Link
                  to="/register"
                  className="text-primary-400 hover:text-primary-300 font-semibold inline-flex items-center gap-1"
                >
                  নতুন বর্ডার রেজিস্ট্রেশন
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Quick Demo Credentials Panel */}
        <div className="p-4 rounded-2xl glass border border-slate-800 text-xs space-y-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ওয়ান-ক্লিক টেস্ট ডেমো লগইন:</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-[11px] py-1.5"
              onClick={() => handleQuickDemoLogin('SUPER_ADMIN')}
            >
              এডমিন / মালিক
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-[11px] py-1.5"
              onClick={() => handleQuickDemoLogin('MANAGER')}
            >
              ম্যানেজার
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-[11px] py-1.5"
              onClick={() => handleQuickDemoLogin('BOARDER')}
            >
              বর্ডার
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
