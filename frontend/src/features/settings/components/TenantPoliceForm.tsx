import React from 'react'
import type { BoarderWithRelations } from '@/features/boarders/api/useBoarders'
import DhakaPoliceLogo from './DhakaPoliceLogo'

export interface RoommateInfo {
  sl: string
  name: string
  age: string
  occupation: string
  phone: string
}

export interface FlatAddressInfo {
  flatFloor: string
  houseHolding: string
  road: string
  area: string
  postCode: string
}

export interface FormMetaInfo {
  division: string
  thana: string
  allotmentDate: string
  landlordName?: string
  landlordPhone?: string
  issueDate?: string
}

interface TenantPoliceFormProps {
  boarder: BoarderWithRelations | null
  roommates?: RoommateInfo[]
  flatInfo?: FlatAddressInfo
  meta?: FormMetaInfo
  containerId?: string
}

export function toBengaliNumerals(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(input).replace(/[0-9]/g, (d) => bnDigits[Number(d)] || d)
}

export function formatBengaliDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      return `${toBengaliNumerals(day)}/${toBengaliNumerals(month)}/${toBengaliNumerals(year)}`
    }
  } catch {
    // fallback
  }
  return toBengaliNumerals(dateStr)
}

/**
 * Exact 1:1 Replica Component for Dhaka Metropolitan Police Tenant Registration Form
 */
export const TenantPoliceForm: React.FC<TenantPoliceFormProps> = ({
  boarder,
  roommates = [],
  flatInfo,
  meta,
  containerId = 'tenant-police-form-print',
}) => {
  // Resolve address values with smart fallback
  const seatObj = boarder?.active_allocation?.seat
  const flatObj = seatObj?.room?.flat
  const roomObj = seatObj?.room
  const buildingObj = flatObj?.building

  const displayFlatFloor =
    flatInfo?.flatFloor ||
    (flatObj?.name ? `${flatObj.name}${roomObj?.name ? ` (${roomObj.name})` : ''}` : 'ফ্ল্যাট ৪এ (৪র্থ তলা)')
  const displayHouseHolding =
    flatInfo?.houseHolding || (buildingObj?.name ? `${buildingObj.name}, হোল্ডিং #৪২` : 'বাড়ি #৪২')
  const displayRoad = flatInfo?.road || 'রোড #১১, সেক্টর #৪'
  const displayArea = flatInfo?.area || 'উত্তরা / শেরে বাংলা নগর'
  const displayPostCode = toBengaliNumerals(flatInfo?.postCode || '১২৩০')

  // Fixed top-center division and thana
  const displayDivision = meta?.division || 'ঢাকা'
  const displayThana = meta?.thana || 'শেরে বাংলা নগর'

  // Serial 17: Allotment date
  const rawAllotmentDate =
    meta?.allotmentDate ||
    boarder?.active_allocation?.start_date ||
    boarder?.admission_date ||
    new Date().toISOString().split('T')[0]
  const displayAllotmentDate = formatBengaliDate(rawAllotmentDate)

  // Current date for footer
  const rawToday = meta?.issueDate || new Date().toISOString().split('T')[0]
  const displayToday = formatBengaliDate(rawToday)

  // Table rows for roommates (Serial 11) - at least 3 rows
  const defaultRoommates: RoommateInfo[] = [
    { sl: '১।', name: '', age: '', occupation: '', phone: '' },
    { sl: '২।', name: '', age: '', occupation: '', phone: '' },
    { sl: '৩।', name: '', age: '', occupation: '', phone: '' },
  ]

  const filledRoommates: RoommateInfo[] = defaultRoommates.map((def, idx) => {
    if (roommates[idx]) {
      return {
        sl: roommates[idx].sl || toBengaliNumerals(idx + 1) + '।',
        name: roommates[idx].name || '',
        age: toBengaliNumerals(roommates[idx].age || ''),
        occupation: roommates[idx].occupation || '',
        phone: toBengaliNumerals(roommates[idx].phone || ''),
      }
    }
    return def
  })

  // Border data mapping
  const fullName = boarder?.full_name || ''
  const fatherName = boarder?.father_name || boarder?.guardian_name || ''
  const dob = boarder?.date_of_birth ? formatBengaliDate(boarder.date_of_birth) : ''
  const maritalStatus = boarder?.marital_status || 'অবিবাহিত'
  const permanentAddress = boarder?.permanent_address || ''
  const occupation = boarder?.occupation || (boarder?.student_id ? 'শিক্ষার্থী' : 'কর্মজীবী')
  const workplace = boarder?.workplace_address || boarder?.institution || ''
  const occupationAndWorkplace = [occupation, workplace].filter(Boolean).join(', ')
  const religion = boarder?.religion || 'ইসলাম'
  const educationalQualification = boarder?.educational_qualification || 'স্নাতক (চলমান)'
  const phone = toBengaliNumerals(boarder?.phone_number || '')
  const email = boarder?.email || ''
  const nidNumber = toBengaliNumerals(boarder?.nid_passport_number || (boarder as any)?.nid_number || '')
  const passportNumber = boarder?.passport_number ? toBengaliNumerals(boarder.passport_number) : ''

  // Emergency contact (Item 10)
  const emergencyName = boarder?.emergency_contact_name || boarder?.guardian_name || ''
  const emergencyRelation = boarder?.emergency_contact_relation || boarder?.guardian_relation || 'পিতা'
  const emergencyAddress =
    boarder?.emergency_contact_address || boarder?.present_address || boarder?.permanent_address || ''
  const emergencyPhone = toBengaliNumerals(
    boarder?.emergency_contact_phone || boarder?.guardian_phone || boarder?.emergency_contact || ''
  )

  // Current Landlord (Item 16)
  const landlordName = meta?.landlordName || 'ব্যাচেলর হোম মেস কর্তৃপক্ষ'
  const landlordPhone = toBengaliNumerals(meta?.landlordPhone || '01700000000')

  return (
    <div
      id={containerId}
      className="bg-white text-black mx-auto p-8 sm:p-10 select-none shadow-xl print:shadow-none print:m-0"
      style={{
        width: '100%',
        maxWidth: '794px', // A4 standard width at 96 DPI
        minHeight: '1123px', // A4 standard height
        fontFamily: "'Nikosh', 'SolaimanLipi', 'Kalpurush', 'Noto Sans Bengali', Arial, sans-serif",
        color: '#000000',
        lineHeight: 1.35,
        backgroundColor: '#ffffff',
      }}
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER SECTION */}
      {/* ============================================================== */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        {/* Left: Photo Box */}
        <div className="w-[125px] h-[150px] border-[1.5px] border-black rounded-[14px] p-1 flex flex-col items-center justify-center text-center flex-shrink-0 bg-white overflow-hidden shadow-sm">
          {boarder?.photo_url ? (
            <img
              src={boarder.photo_url}
              alt="ভাড়াটিয়ার ছবি"
              crossOrigin="anonymous"
              className="w-full h-full object-cover rounded-[10px]"
            />
          ) : (
            <div className="text-[11px] font-medium leading-tight text-slate-700 px-1 py-4 flex flex-col items-center justify-center h-full">
              <span>ভাড়াটিয়ার এক কপি</span>
              <span className="mt-1">পাসপোর্ট সাইজ ছবি</span>
            </div>
          )}
        </div>

        {/* Center: Emblem, Title & Police Station */}
        <div className="flex-1 text-center pt-0 px-2 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <DhakaPoliceLogo size={52} className="w-13 h-13 inline-block" />
            <h1 className="text-xl sm:text-[22px] font-extrabold tracking-tight text-black inline-block">
              ঢাকা মেট্রোপলিটন পুলিশ
            </h1>
          </div>

          <div className="text-xs sm:text-[13px] font-medium space-y-0.5 mt-0.5 text-slate-900">
            <div className="flex items-center justify-center gap-1">
              <span>বিভাগ :</span>
              <span className="font-bold border-b border-black/80 px-4 min-w-[140px] inline-block text-center">
                {displayDivision}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <span>থানা :</span>
              <span className="font-bold border-b border-black/80 px-4 min-w-[140px] inline-block text-center">
                {displayThana}
              </span>
            </div>
          </div>

          <div className="mt-2.5">
            <h2
              className="text-base sm:text-[17px] font-extrabold inline-block text-black px-2 tracking-wide"
              style={{
                borderBottom: '3px double #000000',
                paddingBottom: '2px',
              }}
            >
              ভাড়াটিয়া নিবন্ধন ফরম
            </h2>
          </div>
        </div>

        {/* Right: Flat / Holding Information Box */}
        <div className="w-[185px] border-[1.5px] border-black rounded-[14px] p-2 text-[11px] leading-tight flex-shrink-0 bg-white">
          <div className="space-y-1.5 divide-y divide-slate-300">
            <div className="flex items-center justify-between pt-0.5">
              <span className="font-semibold text-slate-900 whitespace-nowrap">ফ্ল্যাট/তলা :</span>
              <span className="font-bold text-black text-right truncate pl-1">{displayFlatFloor}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-slate-900 whitespace-nowrap">বাড়ী/হোল্ডিং :</span>
              <span className="font-bold text-black text-right truncate pl-1">{displayHouseHolding}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-slate-900 whitespace-nowrap">রাস্তা :</span>
              <span className="font-bold text-black text-right truncate pl-1">{displayRoad}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-slate-900 whitespace-nowrap">এলাকা :</span>
              <span className="font-bold text-black text-right truncate pl-1">{displayArea}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-slate-900 whitespace-nowrap">পোস্ট কোড :</span>
              <span className="font-bold text-black text-right truncate pl-1">{displayPostCode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. BODY FORM FIELDS (১ to ১৭) */}
      {/* ============================================================== */}
      <div className="text-[12px] sm:text-[12.5px] text-black space-y-1.5">
        {/* Item 1 */}
        <div className="flex items-end gap-1.5">
          <span className="font-semibold whitespace-nowrap">১. ভাড়াটিয়া/বাড়ীওয়ালার নাম :</span>
          <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[20px]">
            {fullName}
          </span>
        </div>

        {/* Item 2 */}
        <div className="flex items-end gap-1.5">
          <span className="font-semibold whitespace-nowrap">২. পিতার নাম :</span>
          <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[20px]">
            {fatherName}
          </span>
        </div>

        {/* Item 3 */}
        <div className="flex items-end gap-3">
          <div className="flex items-end gap-1.5 flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap">৩. জন্ম তারিখ :</span>
            <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[20px]">
              {dob}
            </span>
          </div>
          <div className="flex items-end gap-1.5 w-[220px]">
            <span className="font-semibold whitespace-nowrap">বৈবাহিক অবস্থা :</span>
            <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[20px] text-center">
              {maritalStatus}
            </span>
          </div>
        </div>

        {/* Item 4 */}
        <div className="flex items-end gap-1.5">
          <span className="font-semibold whitespace-nowrap">৪. স্থায়ী ঠিকানা :</span>
          <span className="flex-1 font-medium border-b border-black pb-0.5 px-2 min-h-[20px]">
            {permanentAddress}
          </span>
        </div>

        {/* Item 5 */}
        <div className="flex items-end gap-1.5">
          <span className="font-semibold whitespace-nowrap">৫. পেশা ও প্রতিষ্ঠান/কর্মস্থলের ঠিকানা :</span>
          <span className="flex-1 font-medium border-b border-black pb-0.5 px-2 min-h-[20px]">
            {occupationAndWorkplace}
          </span>
        </div>

        {/* Item 6 */}
        <div className="flex items-end gap-3">
          <div className="flex items-end gap-1.5 flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap">৬. ধর্ম :</span>
            <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[20px]">
              {religion}
            </span>
          </div>
          <div className="flex items-end gap-1.5 flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap">শিক্ষাগত যোগ্যতা :</span>
            <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[20px] text-center">
              {educationalQualification}
            </span>
          </div>
        </div>

        {/* Item 7 */}
        <div className="flex items-end gap-3">
          <div className="flex items-end gap-1.5 flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap">৭. মোবাইল নম্বর :</span>
            <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[20px] tracking-wider">
              {phone}
            </span>
          </div>
          <div className="flex items-end gap-1.5 flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap">ই-মেইল আইডি :</span>
            <span className="flex-1 font-medium border-b border-black pb-0.5 px-2 min-h-[20px]">
              {email}
            </span>
          </div>
        </div>

        {/* Item 8 */}
        <div className="flex items-end gap-1.5">
          <span className="font-semibold whitespace-nowrap">৮. জাতীয় পরিচয়পত্র নম্বর :</span>
          <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[20px] tracking-wider">
            {nidNumber}
          </span>
        </div>

        {/* Item 9 */}
        <div className="flex items-end gap-1.5">
          <span className="font-semibold whitespace-nowrap">৯. পাসপোর্ট নম্বর (যদি থাকে) :</span>
          <span className="flex-1 font-medium border-b border-black pb-0.5 px-2 min-h-[20px] tracking-wider">
            {passportNumber}
          </span>
        </div>

        {/* Item 10 */}
        <div className="space-y-1 pt-0.5">
          <div className="font-semibold">১০. জরুরী যোগাযোগ :</div>
          <div className="grid grid-cols-2 gap-3 pl-3">
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-medium whitespace-nowrap">(ক) নাম :</span>
              <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[19px]">
                {emergencyName}
              </span>
            </div>
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-medium whitespace-nowrap">(খ) সম্পর্ক :</span>
              <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[19px]">
                {emergencyRelation}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pl-3">
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-medium whitespace-nowrap">(গ) ঠিকানা :</span>
              <span className="flex-1 font-medium border-b border-black pb-0.5 px-2 min-h-[19px] truncate">
                {emergencyAddress}
              </span>
            </div>
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-medium whitespace-nowrap">(ঘ) মোবাইল নম্বর :</span>
              <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[19px] tracking-wider">
                {emergencyPhone}
              </span>
            </div>
          </div>
        </div>

        {/* Item 11: Table for Roommates / Mess Mates */}
        <div className="space-y-1 pt-1">
          <div className="font-semibold">১১. পরিবার / মেসের সঙ্গীয় সদস্যদের বিবরণ :</div>
          <div className="w-full overflow-hidden border border-black rounded-[4px]">
            <table className="w-full text-center border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-black bg-slate-100 font-semibold text-black">
                  <th className="py-1 px-1.5 border-r border-black w-14">ক্রঃ নং</th>
                  <th className="py-1 px-2 border-r border-black">নাম</th>
                  <th className="py-1 px-2 border-r border-black w-18">বয়স</th>
                  <th className="py-1 px-2 border-r border-black w-32">পেশা</th>
                  <th className="py-1 px-2 w-36">মোবাইল নম্বর</th>
                </tr>
              </thead>
              <tbody>
                {filledRoommates.map((m, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-black last:border-b-0 h-6.5 text-black hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-0.5 px-1 border-r border-black font-semibold text-center">{m.sl}</td>
                    <td className="py-0.5 px-2 border-r border-black text-left font-medium truncate max-w-[200px]">
                      {m.name}
                    </td>
                    <td className="py-0.5 px-2 border-r border-black">{m.age}</td>
                    <td className="py-0.5 px-2 border-r border-black text-left truncate max-w-[120px]">
                      {m.occupation}
                    </td>
                    <td className="py-0.5 px-2 font-mono text-center tracking-wide">{m.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Item 12 */}
        <div className="space-y-1 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">১২. গৃহকর্মীর নাম :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">জাতীয় পরিচয়পত্র নং :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pl-4">
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">মোবাইল নম্বর :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">স্থায়ী ঠিকানা :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
          </div>
        </div>

        {/* Item 13 */}
        <div className="space-y-1 pt-0.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">১৩. ড্রাইভারের নাম :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">জাতীয় পরিচয়পত্র নং :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pl-4">
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">মোবাইল নম্বর :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">স্থায়ী ঠিকানা :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
          </div>
        </div>

        {/* Item 14 */}
        <div className="space-y-1 pt-0.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">১৪. পূর্ববর্তী বাড়িওয়ালার নাম :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
            <div className="flex items-end gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">মোবাইল নম্বর :</span>
              <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
            </div>
          </div>
          <div className="flex items-end gap-1.5 pl-4">
            <span className="font-semibold whitespace-nowrap">ঠিকানা :</span>
            <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
          </div>
        </div>

        {/* Item 15 */}
        <div className="flex items-end gap-1.5 pt-0.5">
          <span className="font-semibold whitespace-nowrap">১৫. পূর্ববর্তী বাসা ছাড়ার কারণ :</span>
          <span className="flex-1 border-b border-black pb-0.5 min-h-[19px]"></span>
        </div>

        {/* Item 16 */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <div className="flex items-end gap-1.5 min-w-0">
            <span className="font-semibold whitespace-nowrap">১৬. বর্তমান বাড়িওয়ালার নাম :</span>
            <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[19px]">
              {landlordName}
            </span>
          </div>
          <div className="flex items-end gap-1.5 min-w-0">
            <span className="font-semibold whitespace-nowrap">মোবাইল নম্বর :</span>
            <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[19px]">
              {landlordPhone}
            </span>
          </div>
        </div>

        {/* Item 17 */}
        <div className="flex items-end gap-1.5 pt-0.5">
          <span className="font-semibold whitespace-nowrap">১৭. বর্তমান বাড়ীতে কোন তারিখ থেকে বসবাস :</span>
          <span className="flex-1 font-bold border-b border-black pb-0.5 px-2 min-h-[19px]">
            {displayAllotmentDate}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SIGNATURE & FOOTER SECTION */}
      {/* ============================================================== */}
      <div className="mt-8 pt-4 flex items-end justify-between text-xs sm:text-[13px] text-black">
        <div className="min-w-[160px] text-center">
          <div className="border-b border-black mb-1.5 pb-0.5 font-bold">
            {displayToday}
          </div>
          <div className="font-semibold">তারিখ</div>
        </div>

        <div className="min-w-[200px] text-center">
          <div className="border-b border-black mb-1.5 pb-0.5 h-6"></div>
          <div className="font-semibold">ভাড়াটিয়ার স্বাক্ষর</div>
        </div>
      </div>

      <div className="mt-5 text-center text-[11px] sm:text-[11.5px] font-bold text-black border-t border-slate-300 pt-2.5">
        বিঃদ্রঃ এই ফরমের একটি কপি বাড়ির মালিক অবশ্যই সংরক্ষণ করবেন।
      </div>
    </div>
  )
}

export default TenantPoliceForm
