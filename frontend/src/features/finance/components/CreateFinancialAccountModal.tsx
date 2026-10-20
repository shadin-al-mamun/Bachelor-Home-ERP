import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { queryClient } from '@/lib/queryClient'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { FinancialAccount, FinancialAccountType } from '@/types/database'
import {
  Wallet,
  Building2,
  Smartphone,
  Banknote,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface CreateFinancialAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAccountCreated?: (account: FinancialAccount) => void
  accountToEdit?: FinancialAccount | null
}

export const CreateFinancialAccountModal: React.FC<CreateFinancialAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountCreated,
  accountToEdit,
}) => {
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<FinancialAccountType>('CASH_OWNER')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setAccountName('')
    setAccountType('CASH_OWNER')
    setAccountNumber('')
    setBankName('')
    setOpeningBalance(0)
    setErrorMsg(null)
  }, [])

  useEffect(() => {
    if (accountToEdit) {
      setAccountName(accountToEdit.account_name)
      setAccountType(accountToEdit.account_type)
      setAccountNumber(accountToEdit.account_number || '')
      setBankName(accountToEdit.bank_name || '')
      setOpeningBalance(accountToEdit.current_balance)
      setErrorMsg(null)
    } else {
      resetForm()
    }
  }, [accountToEdit, isOpen, resetForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!accountName.trim()) {
      setErrorMsg('অনুগ্রহ করে একাউন্টের নাম লিখুন।')
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        account_name: accountName.trim(),
        account_type: accountType,
        account_number: accountNumber.trim() || null,
        bank_name: bankName.trim() || (accountType === 'MFS' ? 'bKash/Nagad' : accountType === 'BANK' ? 'Bank' : 'Cash Safe'),
        current_balance: Math.max(0, Number(openingBalance) || 0),
        is_active: true,
      }

      let resultAccount: FinancialAccount

      if (isSupabaseConfigured) {
        if (accountToEdit) {
          const { data, error } = await supabase
            .from('financial_accounts')
            .update(payload)
            .eq('id', accountToEdit.id)
            .select('*')
            .single()

          if (error) throw new Error(error.message)
          resultAccount = data as FinancialAccount
        } else {
          const { data, error } = await supabase
            .from('financial_accounts')
            .insert(payload)
            .select('*')
            .single()

          if (error) throw new Error(error.message)
          resultAccount = data as FinancialAccount
        }
      } else {
        // Offline / demo fallback
        resultAccount = {
          id: accountToEdit ? accountToEdit.id : 'fa-' + Date.now(),
          ...payload,
          account_number: payload.account_number || '',
          bank_name: payload.bank_name || '',
          created_at: accountToEdit ? accountToEdit.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as FinancialAccount
      }

      // Invalidate queries so all dropdowns and balance cards across the app immediately update
      await queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      await queryClient.invalidateQueries({ queryKey: ['expense-accounts'] })

      if (onAccountCreated) {
        onAccountCreated(resultAccount)
      }

      resetForm()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অ্যাকাউন্ট সংরক্ষণ করতে সমস্যা হয়েছে।'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm()
        onClose()
      }}
      title={accountToEdit ? "অ্যাকাউন্টের তথ্য ও ব্যালেন্স সম্পাদন (Edit Account)" : "নতুন ব্যাংক বা ক্যাশ অ্যাকাউন্ট যোগ করুন"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Account Type Selector Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            অ্যাকাউন্টের ধরন <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                setAccountType('CASH_OWNER')
                if (!accountName) setAccountName('মেইন ক্যাশ বক্স')
              }}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${accountType === 'CASH_OWNER'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">মেইন ক্যাশ</span>
              <span className="text-[10px] text-slate-500">হোস্টেল ক্যাশ ভল্ট</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('MFS')
                if (!accountName) setAccountName('বিকাশ মার্চেন্ট একাউন্ট')
                if (!bankName) setBankName('bKash')
              }}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${accountType === 'MFS'
                  ? 'bg-pink-950/60 border-pink-500/50 text-pink-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
            >
              <Smartphone className="w-4 h-4 text-pink-400" />
              <span className="font-bold">বিকাশ / নগদ</span>
              <span className="text-[10px] text-slate-500">MFS ওয়ালেট</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('BANK')
                if (!accountName) setAccountName('ব্যাংক চলতি হিসাব')
              }}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${accountType === 'BANK'
                  ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="font-bold">ব্যাংক হিসাব</span>
              <span className="text-[10px] text-slate-500">ব্যাংক ডিপোজিট</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('CASH_MANAGER')
                if (!accountName) setAccountName('ম্যানেজার ক্যাশ ড্রয়ার')
              }}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${accountType === 'CASH_MANAGER'
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
            >
              <Wallet className="w-4 h-4 text-amber-400" />
              <span className="font-bold">ম্যানেজার ক্যাশ</span>
              <span className="text-[10px] text-slate-500">দৈনিক ক্যাশ ড্রয়ার</span>
            </button>
          </div>
        </div>

        {/* Account Name */}
        <Input
          label="অ্যাকাউন্টের নাম"
          placeholder="যেমন: মেইন ক্যাশ নিরাপদ ভল্ট, ইসলামী ব্যাংক, বিকাশ মার্চেন্ট"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Account Number */}
          <Input
            label={accountType === 'MFS' ? 'বিকাশ / নগদ মোবাইল নম্বর' : 'অ্যাকাউন্ট নম্বর (ঐচ্ছিক)'}
            placeholder={accountType === 'MFS' ? 'যেমন: 017XXXXXXXX' : 'যেমন: 2050123456789'}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />

          {/* Bank / Provider Name */}
          <Input
            label={accountType === 'MFS' ? 'সার্ভিস প্রোভাইডার' : 'ব্যাংকের নাম (ঐচ্ছিক)'}
            placeholder={accountType === 'MFS' ? 'যেমন: bKash, Nagad, Rocket' : 'যেমন: Islami Bank, DBBL'}
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
        </div>

        {/* Initial / Opening Balance */}
        <Input
          type="number"
          label={accountToEdit ? "বর্তমান ব্যালেন্স (Current Balance - ৳)" : "শুরুর ব্যালেন্স (Opening Balance - ৳)"}
          placeholder="0"
          value={openingBalance || ''}
          onChange={(e) => setOpeningBalance(Number(e.target.value))}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              resetForm()
              onClose()
            }}
          >
            বাতিল
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            {accountToEdit ? 'পরিবর্তন সংরক্ষণ করুন' : 'অ্যাকাউন্ট তৈরি নিশ্চিত করুন'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateFinancialAccountModal
