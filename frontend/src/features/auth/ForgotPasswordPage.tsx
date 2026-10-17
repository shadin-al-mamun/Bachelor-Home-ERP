import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/common'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })

        if (error) {
          setErrorMessage(error.message)
          setIsLoading(false)
          return
        }
      }

      setIsSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অনুরোধটি ব্যর্থ হয়েছে।'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative">
      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 p-0.5 shadow-xl shadow-primary-500/25 mx-auto flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            পাসওয়ার্ড পুনরুদ্ধার
          </h1>
          <p className="text-xs text-slate-400">
            আপনার নিবন্ধিত ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হবে
          </p>
        </div>

        <Card variant="glass" className="border-slate-800 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary-400" />
              <span>পাসওয়ার্ড রিসেট করুন</span>
            </CardTitle>
            <CardDescription>
              ইমেইল অ্যাড্রেসটি লিখুন যা আপনার অ্যাকাউন্টে ব্যবহৃত হয়েছে
            </CardDescription>
          </CardHeader>

          {isSuccess ? (
            <CardContent className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">রিসেট লিংক পাঠানো হয়েছে!</p>
                  <p className="text-slate-300 leading-relaxed">
                    আমরা <span className="text-emerald-300 font-mono">{email}</span> ঠিকানায় একটি পাসওয়ার্ড রিকভারি লিংক পাঠিয়েছি। অনুগ্রহ করে আপনার ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/login" className="block">
                  <Button variant="outline" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    লগইন পেজে ফিরে যান
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-2">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Input
                  label="নিবন্ধিত ইমেইল অ্যাড্রেস"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />
              </CardContent>

              <CardFooter className="justify-between pt-4 border-t border-slate-800/80">
                <Link to="/login">
                  <Button type="button" variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    পেছনে যান
                  </Button>
                </Link>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                >
                  লিংক পাঠান
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
