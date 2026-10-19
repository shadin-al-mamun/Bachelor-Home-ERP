import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Lock,
  Mail,
  Phone,
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
import { getStoredBoarders } from '@/features/boarders/api/useBoarders'
import type { UserRole } from '@/types/database'

function normalizePhoneNumber(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+880')) {
    return '0' + cleaned.slice(4)
  }
  if (cleaned.startsWith('880')) {
    return '0' + cleaned.slice(3)
  }
  return cleaned
}

function isPhoneNumber(val: string): boolean {
  const cleaned = val.replace(/[\s\-()+]/g, '')
  return /^\d{7,15}$/.test(cleaned)
}

export const LoginPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setDemoUser } = useAuthStore()

  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone')
  const [identifier, setIdentifier] = useState('')
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
      navigate('/portal/dashboard', { replace: true })
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

    const rawInput = identifier.trim()
    if (!rawInput) {
      setErrorMessage(loginMethod === 'phone' ? 'অনুগ্রহ করে মোবাইল নম্বর লিখুন।' : 'অনুগ্রহ করে ইমেইল লিখুন।')
      setIsLoading(false)
      return
    }

    if (!password) {
      setErrorMessage('অনুগ্রহ করে পাসওয়ার্ড লিখুন।')
      setIsLoading(false)
      return
    }

    const looksLikePhone = isPhoneNumber(rawInput)
    const normalizedPhone = looksLikePhone ? normalizePhoneNumber(rawInput) : ''

    if (loginMethod === 'phone' && looksLikePhone && (normalizedPhone.length !== 11 || !normalizedPhone.startsWith('01'))) {
      setErrorMessage('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01711223344)')
      setIsLoading(false)
      return
    }

    try {
      if (!isSupabaseConfigured) {
        // Smart offline/demo authentication
        if (
          normalizedPhone === '01711000000' ||
          rawInput.toLowerCase().includes('admin') ||
          rawInput === 'admin@bachelorhome.erp'
        ) {
          setDemoUser('SUPER_ADMIN', {
            phone_number: normalizedPhone || '01711000000',
            email: looksLikePhone ? 'admin@bachelorhome.erp' : rawInput,
            full_name: 'হোস্টেল এডমিন (মালিক)',
          })
          handleRoleRedirect('SUPER_ADMIN')
          return
        }

        if (
          normalizedPhone === '01800000001' ||
          rawInput.toLowerCase().includes('manager') ||
          rawInput === 'manager@bachelorhome.erp'
        ) {
          setDemoUser('MANAGER', {
            phone_number: normalizedPhone || '01800000001',
            email: looksLikePhone ? 'manager@bachelorhome.erp' : rawInput,
            full_name: 'ম্যানেজার তানভীর',
          })
          handleRoleRedirect('MANAGER')
          return
        }

        if (
          normalizedPhone === '01600000001' ||
          rawInput.toLowerCase().includes('applicant') ||
          rawInput === 'applicant@bachelorhome.erp'
        ) {
          setDemoUser('APPLICANT', {
            phone_number: normalizedPhone || '01600000001',
            email: looksLikePhone ? 'applicant@bachelorhome.erp' : rawInput,
            full_name: 'নতুন আবেদনকারী',
          })
          handleRoleRedirect('APPLICANT')
          return
        }

        // Match against active boarders in storage
        const boarders = getStoredBoarders()
        const matchedBoarder = boarders.find((b) => {
          const bPhone = normalizePhoneNumber(b.phone_number || '')
          return (
            (looksLikePhone && bPhone === normalizedPhone) ||
            (!looksLikePhone && b.email?.toLowerCase() === rawInput.toLowerCase())
          )
        })

        if (matchedBoarder) {
          setDemoUser('BOARDER', {
            id: matchedBoarder.user_id || matchedBoarder.id,
            phone_number: matchedBoarder.phone_number,
            email: matchedBoarder.email || `${matchedBoarder.phone_number}@bachelorhome.erp`,
            full_name: matchedBoarder.full_name,
            avatar_url: matchedBoarder.photo_url || undefined,
          })
          handleRoleRedirect('BOARDER')
          return
        }

        // Default custom boarder session
        setDemoUser('BOARDER', {
          phone_number: normalizedPhone || '01711223344',
          email: looksLikePhone ? `${normalizedPhone}@bachelorhome.erp` : rawInput,
          full_name: looksLikePhone ? `বর্ডার (${normalizedPhone})` : 'বর্ডার সদস্য',
        })
        handleRoleRedirect('BOARDER')
        return
      }

      // --- When Supabase is configured ---
      let loginEmail = rawInput

      if (looksLikePhone) {
        // Find email linked to this phone number in profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, role, id')
          .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+88${normalizedPhone}`)
          .maybeSingle()

        if (profileData?.email) {
          loginEmail = profileData.email
        } else {
          // Check boarders table
          const { data: boarderData } = await supabase
            .from('boarders')
            .select('email, user_id')
            .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+88${normalizedPhone}`)
            .maybeSingle()

          if (boarderData?.email) {
            loginEmail = boarderData.email
          } else {
            // Try direct Supabase phone sign in if enabled
            const { data: phoneAuthData, error: phoneError } = await supabase.auth.signInWithPassword({
              phone: normalizedPhone.startsWith('+') ? normalizedPhone : `+88${normalizedPhone}`,
              password,
            })

            if (!phoneError && phoneAuthData.user) {
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', phoneAuthData.user.id)
                .maybeSingle()
              handleRoleRedirect((userProfile?.role as UserRole) || 'BOARDER')
              return
            }

            setErrorMessage('এই মোবাইল নম্বরের সাথে নিবন্ধিত কোনো অ্যাকাউন্ট পাওয়া যায়নি।')
            setIsLoading(false)
            return
          }
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) {
        setErrorMessage(
          error.message === 'Invalid login credentials'
            ? `${loginMethod === 'phone' ? 'মোবাইল নম্বর' : 'ইমেইল'} বা পাসওয়ার্ড সঠিক নয়।`
            : error.message
        )
        setIsLoading(false)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()

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

  const handleQuickDemo = (role: UserRole, phone: string, demoEmail: string) => {
    if (loginMethod === 'phone') {
      setIdentifier(phone)
    } else {
      setIdentifier(demoEmail)
    }
    setPassword('demo123456')

    if (!isSupabaseConfigured) {
      const boarders = getStoredBoarders()
      const matched = boarders.find((b) => normalizePhoneNumber(b.phone_number || '') === phone)
      if (matched) {
        setDemoUser(role, {
          id: matched.user_id || matched.id,
          phone_number: matched.phone_number,
          email: matched.email || `${matched.phone_number}@bachelorhome.erp`,
          full_name: matched.full_name,
          avatar_url: matched.photo_url || undefined,
        })
      } else {
        setDemoUser(role, {
          phone_number: phone,
          email: demoEmail,
        })
      }
      handleRoleRedirect(role)
    }
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
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">অ্যাকাউন্টে প্রবেশ করুন</CardTitle>
            <CardDescription>
              মোবাইল নম্বর অথবা ইমেইল এবং পাসওয়ার্ড দিয়ে সাইন-ইন করুন
            </CardDescription>

            {/* Login Method Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 mt-3">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('phone')
                  setErrorMessage(null)
                }}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  loginMethod === 'phone'
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>মোবাইল নম্বর</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('email')
                  setErrorMessage(null)
                }}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  loginMethod === 'email'
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>ইমেইল</span>
              </button>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-1">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {loginMethod === 'phone' ? (
                <div className="space-y-1">
                  <Input
                    label="মোবাইল নম্বর"
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={identifier}
                    onChange={(e) => {
                      const val = e.target.value
                      setIdentifier(val)
                      if (val.includes('@')) {
                        setLoginMethod('email')
                      }
                    }}
                    leftIcon={<Phone className="w-4 h-4 text-primary-400" />}
                    required
                  />
                  <p className="text-[11px] text-slate-400 px-1">
                    ১১ ডিজিটের নিবন্ধিত মোবাইল নম্বর দিন (যেমন: 01711223344)
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    label="ইমেইল ঠিকানা"
                    type="email"
                    placeholder="name@example.com"
                    value={identifier}
                    onChange={(e) => {
                      const val = e.target.value
                      setIdentifier(val)
                      if (/^01\d{2,}$/.test(val)) {
                        setLoginMethod('phone')
                      }
                    }}
                    leftIcon={<Mail className="w-4 h-4 text-primary-400" />}
                    required
                  />
                  <p className="text-[11px] text-slate-400 px-1">
                    আপনার নিবন্ধিত ইমেইল ঠিকানা লিখুন
                  </p>
                </div>
              )}

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

        {/* Quick Demo Credentials Panel (Only shown in offline demo mode) */}
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-2xl glass border border-slate-800 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>১-ক্লিকে টেস্ট ডেমো লগইন:</span>
              </div>
              <span className="text-[10px] text-primary-400 bg-primary-950/60 border border-primary-800/40 px-2 py-0.5 rounded-full">
                মোবাইল ও পাসওয়ার্ড
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('SUPER_ADMIN', '01711000000', 'admin@bachelorhome.erp')}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-primary-500/40 text-left transition-all group"
              >
                <div className="font-semibold text-white group-hover:text-primary-300 text-xs flex items-center justify-between">
                  <span>এডমিন / মালিক</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">Admin</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">📱 01711000000</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('MANAGER', '01800000001', 'manager@bachelorhome.erp')}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-primary-500/40 text-left transition-all group"
              >
                <div className="font-semibold text-white group-hover:text-primary-300 text-xs flex items-center justify-between">
                  <span>ম্যানেজার তানভীর</span>
                  <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded">Manager</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">📱 01800000001</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('BOARDER', '01711223344', 'tanvir.ahmed@example.com')}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-primary-500/40 text-left transition-all group"
              >
                <div className="font-semibold text-white group-hover:text-primary-300 text-xs flex items-center justify-between">
                  <span>বর্ডার (তানভীর)</span>
                  <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">Boarder</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">📱 01711223344</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('BOARDER', '01912345678', 'rakibul.hasan@example.com')}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-primary-500/40 text-left transition-all group"
              >
                <div className="font-semibold text-white group-hover:text-primary-300 text-xs flex items-center justify-between">
                  <span>বর্ডার (রাকিবুল)</span>
                  <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">Boarder</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">📱 01912345678</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginPage
