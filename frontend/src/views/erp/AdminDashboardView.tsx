import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BedDouble,
  ShieldCheck,
  DollarSign,
  UtensilsCrossed,
  Sparkles,
  Save,
  Filter,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Smartphone,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  Input,
  Select,
} from '@/components/common'
import { formatBDT, getDhakaNow } from '@/utils/date'

export const AdminDashboardView: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isButtonLoading, setIsButtonLoading] = useState(false)
  const [demoInput, setDemoInput] = useState('')
  const [hasError, setHasError] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState('single')

  const roomOptions = [
    { value: 'single', label: i18n.language === 'bn' ? 'সিঙ্গেল ডিলাক্স রুম' : 'Single Deluxe Room' },
    { value: 'double', label: i18n.language === 'bn' ? 'ডাবল সিট মাস্টার রুম' : 'Double Seat Master Room' },
    { value: 'four', label: i18n.language === 'bn' ? '৪-সিট স্ট্যান্ডার্ড মেস রুম' : '4-Seat Standard Room' },
  ]

  return (
    <div className="space-y-6">
      {/* Banner Section */}
      <section className="relative overflow-hidden rounded-3xl glass-card border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bachelor Home ERP — Production Architecture & RBAC System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t('demo.headline')}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {t('demo.description')}
          </p>
        </div>
      </section>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="interactive" className="p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>{t('demo.statsSeats')}</span>
            <BedDouble className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">120</div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <Badge status="AVAILABLE" showDot={true}>
              {t('status.AVAILABLE')} 35
            </Badge>
          </div>
        </Card>

        <Card variant="interactive" className="p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>{t('demo.statsOccupied')}</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">85</div>
          <div className="mt-2 text-xs text-indigo-400 flex items-center gap-1">
            <Badge status="OCCUPIED" showDot={true}>
              {t('status.OCCUPIED')} 70.8%
            </Badge>
          </div>
        </Card>

        <Card variant="interactive" className="p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>{t('demo.statsCash')}</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatBDT(48750)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {t('common.date')}: {getDhakaNow().format('DD MMM YYYY')}
          </div>
        </Card>

        <Card variant="interactive" className="p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>{t('demo.statsCutoff')}</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">
            10:00 PM
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <Badge status="PENDING" showDot={true}>
              Asia/Dhaka
            </Badge>
          </div>
        </Card>
      </div>

      {/* Component Showcase Tabs / Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Button Variants */}
        <Card>
          <CardHeader>
            <CardTitle>{t('demo.buttonsTitle')}</CardTitle>
            <CardDescription>
              Primary, secondary, danger, outline, ghost styles with loading state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" leftIcon={<Save className="w-4 h-4" />}>
                {t('common.save')}
              </Button>
              <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
                {t('common.filter')}
              </Button>
              <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />}>
                {t('common.delete')}
              </Button>
              <Button variant="outline" rightIcon={<ExternalLink className="w-4 h-4" />}>
                {t('common.export')}
              </Button>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="primary"
                isLoading={isButtonLoading}
                onClick={() => {
                  setIsButtonLoading(true)
                  setTimeout(() => setIsButtonLoading(false), 2000)
                }}
              >
                {isButtonLoading ? t('common.loading') : 'Test Loading Spinner'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Status Badges */}
        <Card>
          <CardHeader>
            <CardTitle>{t('demo.badgesTitle')}</CardTitle>
            <CardDescription>
              Bilingual pills with luminous status indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5">
              <Badge status="ACTIVE">{t('status.ACTIVE')}</Badge>
              <Badge status="AVAILABLE">{t('status.AVAILABLE')}</Badge>
              <Badge status="OCCUPIED">{t('status.OCCUPIED')}</Badge>
              <Badge status="PENDING">{t('status.PENDING')}</Badge>
              <Badge status="PAID">{t('status.PAID')}</Badge>
              <Badge status="DUE">{t('status.DUE')}</Badge>
              <Badge status="PARTIAL">{t('status.PARTIAL')}</Badge>
              <Badge status="REJECTED">{t('status.REJECTED')}</Badge>
              <Badge status="INACTIVE">{t('status.INACTIVE')}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Forms & Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>{t('demo.formsTitle')}</CardTitle>
            <CardDescription>
              Accessible form controls with focus rings & real-time error states
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label={t('demo.nameLabel')}
              placeholder={t('demo.namePlaceholder')}
              value={demoInput}
              onChange={(e) => setDemoInput(e.target.value)}
              helperText={t('demo.helperText')}
              error={hasError ? 'নাম ন্যূনতম ৩ অক্ষরের হতে হবে (Validation Error)' : undefined}
              required
            />

            <Select
              label={t('demo.roomTypeLabel')}
              options={roomOptions}
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              required
            />
          </CardContent>
          <CardFooter className="justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHasError(!hasError)}
            >
              {hasError ? 'Clear Error State' : 'Simulate Error State'}
            </Button>
            <Button size="sm" variant="primary">
              {t('common.save')}
            </Button>
          </CardFooter>
        </Card>

        {/* Section 4: Modal & PWA Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t('demo.modalTitle')}</CardTitle>
            <CardDescription>
              Radix UI dialog primitive with mobile PWA install readiness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">PWA Manifest & Cache</div>
                  <div className="text-xs text-slate-400">Standalone Hostelerp WebApp enabled</div>
                </div>
              </div>
              <Badge status="ACTIVE" showDot={true}>Active</Badge>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                {t('demo.openModal')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accessible Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('demo.modalHeader')}
        description="Radix UI Dialog + Glassmorphic Tailwind CSS"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              {t('demo.modalConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300 leading-relaxed">
          {t('demo.modalBody')}
        </p>
      </Modal>
    </div>
  )
}

export default AdminDashboardView
