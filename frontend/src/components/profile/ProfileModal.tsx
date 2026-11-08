import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Shield,
  Phone,
  Mail,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { compressProfilePhoto } from '@/utils/imageCompression'
import { useUpdateAvatarMutation } from '@/features/governance/api/useUserManagement'
import type { Profile } from '@/types/database'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  targetUser?: Partial<Profile> | null
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'সুপার এডমিন (মালিক)', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  ADMIN: { label: 'হোস্টেল এডমিন', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  MANAGER: { label: 'হোস্টেল ম্যানেজার', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  ACCOUNTANT: { label: 'হিসাবরক্ষক (Accountant)', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  MEAL_OPERATOR: { label: 'মিল অপারেটর', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  AUDITOR: { label: 'নিরীক্ষক (Auditor)', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
  BOARDER: { label: 'আবাসিক বর্ডার', color: 'bg-teal-500/10 text-teal-300 border-teal-500/30' },
  APPLICANT: { label: 'নতুন আবেদনকারী', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const { profile: currentUser } = useAuthStore()
  const updateAvatarMutation = useUpdateAvatarMutation()

  const activeUser = targetUser || currentUser
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(activeUser?.avatar_url || null)
      setSelectedFile(null)
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }, [isOpen, activeUser])

  if (!isOpen || !activeUser) return null

  const roleMeta = ROLE_LABELS[activeUser.role || ''] || {
    label: activeUser.role || 'ব্যবহারকারী',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        setErrorMessage('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (JPG, PNG, WEBP) নির্বাচন করুন।')
        return
      }

      setIsProcessing(true)
      try {
        const { file: compressed, dataUrl } = await compressProfilePhoto(file)
        setSelectedFile(compressed)
        setPreviewUrl(dataUrl)
      } catch (err: unknown) {
        console.warn('Compression error fallback:', err)
        setSelectedFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const handleSavePhoto = async () => {
    if (!activeUser.id) {
      setErrorMessage('ব্যবহারকারী আইডি অনুপস্থিত।')
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      let finalUrl = previewUrl || ''

      // If a new file was chosen, upload to Supabase avatars bucket
      if (selectedFile && isSupabaseConfigured) {
        try {
          const ext = selectedFile.name.split('.').pop() || 'jpg'
          const filePath = `${activeUser.id}/${Date.now()}.${ext}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, selectedFile, {
              upsert: true,
              cacheControl: '3600',
            })

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(uploadData.path)

            if (publicUrlData?.publicUrl) {
              finalUrl = publicUrlData.publicUrl
            }
          }
        } catch (uploadErr) {
          console.warn('Supabase storage upload failed, saving data URL directly:', uploadErr)
        }
      }

      await updateAvatarMutation.mutateAsync({
        userId: activeUser.id,
        avatarUrl: finalUrl,
      })

      setSuccessMessage('প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে!')
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ছবি আপডেট করতে সমস্যা হয়েছে।'
      setErrorMessage(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!activeUser.id) return
    setIsProcessing(true)
    setErrorMessage(null)
    try {
      await updateAvatarMutation.mutateAsync({
        userId: activeUser.id,
        avatarUrl: '',
      })
      setPreviewUrl(null)
      setSelectedFile(null)
      setSuccessMessage('প্রোফাইল ছবি মুছে ফেলা হয়েছে।')
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ছবি মুছে ফেলতে সমস্যা হয়েছে।'
      setErrorMessage(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">প্রোফাইল ও ছবি সেটিংস</h3>
              <p className="text-xs text-slate-400">ব্যক্তিগত প্রোফাইল ও ছবি হালনাগাদ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Avatar Area */}
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-2 border-indigo-500/40 bg-slate-800 p-1 shadow-xl flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={activeUser.full_name || 'Avatar'}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-950 to-slate-800 flex items-center justify-center text-3xl font-bold text-indigo-300">
                    {activeUser.full_name ? activeUser.full_name.charAt(0).toUpperCase() : <User className="w-12 h-12" />}
                  </div>
                )}
              </div>

              {/* Camera Overlay Icon */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-transform active:scale-95 border-2 border-slate-900 cursor-pointer"
                title="নতুন ছবি নির্বাচন করুন"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Actions for photo */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>{previewUrl ? 'ছবি পরিবর্তন' : 'ছবি নির্বাচন'}</span>
              </button>

              {previewUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>মুছে ফেলুন</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              JPG, PNG বা WEBP (সর্বোচ্চ ১৫ MB)। স্বয়ংক্রিয়ভাবে ক্রপ ও কম্প্রেস হবে।
            </p>
          </div>

          {/* User Details Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white block">{activeUser.full_name || 'নাম নেই'}</span>
                <span className="text-[11px] font-mono text-slate-400">ID: {activeUser.id?.slice(0, 13)}...</span>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleMeta.color}`}>
                {roleMeta.label}
              </span>
            </div>

            <div className="border-t border-slate-700/60 pt-2 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono">{activeUser.phone_number || 'মোবাইল নম্বর যুক্ত নেই'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{activeUser.email || 'ইমেইল যুক্ত নেই'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>রোল-ভিত্তিক ডেটা এক্সেস কন্ট্রোল সক্রিয়</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSavePhoto}
            disabled={isProcessing || (!selectedFile && previewUrl === activeUser.avatar_url)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-600/20"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ছবি সংরক্ষণ করুন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
