import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/common'
import { useAuthStore } from '@/app/store/useAuthStore'

export const UnauthorizedView: React.FC = () => {
  const { profile } = useAuthStore()

  const homePath =
    profile?.role === 'BOARDER'
      ? '/portal/my-meals'
      : profile?.role === 'APPLICANT'
      ? '/portal/my-application'
      : '/dashboard'

  const homeLabel =
    profile?.role === 'BOARDER'
      ? 'আমার মিল ও বর্ডার পোর্টাল'
      : profile?.role === 'APPLICANT'
      ? 'আবেদন স্ট্যাটাস পেজ'
      : 'মূল ড্যাশবোর্ড'

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card variant="glass" className="max-w-md w-full border-rose-500/30">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <CardTitle className="justify-center text-xl text-rose-300">
            অনুমতি নেই (Access Denied)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-slate-300">
            দুঃখিত, এই পেজটি দেখার জন্য আপনার নির্ধারিত রোলে অনুমতি নেই। আপনার বর্তমান রোল:{' '}
            <span className="font-semibold text-primary-400">{profile?.role || 'গেস্ট / লগইনবিহীন'}</span>
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={homePath} className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full" leftIcon={<Home className="w-4 h-4" />}>
                {homeLabel}
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                লগইন পেজে যান
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default UnauthorizedView
