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
  dob?: string
  fatherName?: string
  maritalStatus?: string
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
    const cleanStr = String(dateStr).trim()
    if (!cleanStr) return ''
    const isoPart = cleanStr.split('T')[0]

    // Handle dash-separated: YYYY-MM-DD or DD-MM-YYYY
    if (isoPart.includes('-')) {
      const parts = isoPart.split('-')
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const [year, month, day] = parts
          return `${toBengaliNumerals(day)}/${toBengaliNumerals(month)}/${toBengaliNumerals(year)}`
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          const [day, month, year] = parts
          return `${toBengaliNumerals(day)}/${toBengaliNumerals(month)}/${toBengaliNumerals(year)}`
        }
      }
    }

    // Handle slash-separated: YYYY/MM/DD or DD/MM/YYYY
    if (isoPart.includes('/')) {
      const parts = isoPart.split('/')
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY/MM/DD
          const [year, month, day] = parts
          return `${toBengaliNumerals(day)}/${toBengaliNumerals(month)}/${toBengaliNumerals(year)}`
        } else if (parts[2].length === 4) {
          // DD/MM/YYYY
          const [day, month, year] = parts
          return `${toBengaliNumerals(day)}/${toBengaliNumerals(month)}/${toBengaliNumerals(year)}`
        }
      }
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
  const displayRoad = flatInfo?.road || '৯ সাত্তার টাওয়ার'
  const displayArea = flatInfo?.area || 'শেরে বাংলা নগর'
  const displayPostCode = toBengaliNumerals(flatInfo?.postCode || '১২০৭')

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
  const fatherName = meta?.fatherName || boarder?.father_name || boarder?.guardian_name || ''
  const rawDob = meta?.dob || boarder?.date_of_birth || ''
  const dob = rawDob ? formatBengaliDate(rawDob) : ''
  const maritalStatus = meta?.maritalStatus || boarder?.marital_status || 'অবিবাহিত'
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

  // Serial 16: Fixed landlord info for all boarders as specifically requested
  const FIXED_LANDLORD_NAME = 'মোঃ আব্দুস সাত্তার'
  const FIXED_LANDLORD_PHONE = toBengaliNumerals('01718246365')

  return (
    <div
      id={containerId}
      className="bg-white text-black mx-auto p-8 sm:p-10 select-none shadow-xl print:shadow-none print:m-0"
      style={{
        width: '100%',
        maxWidth: '794px', // A4 standard width at 96 DPI
        minHeight: '1123px', // A4 standard height
        fontFamily: "'Hind Siliguri', 'Nikosh', 'SolaimanLipi', 'Kalpurush', 'Noto Sans Bengali', Arial, sans-serif",
        color: '#000000',
        lineHeight: 1.4,
        backgroundColor: '#ffffff',
      }}
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER SECTION */}
      {/* ============================================================== */}
      <div className="flex items-start justify-between gap-3 mb-4">
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
            <div className="text-[12px] font-semibold leading-relaxed text-black px-1 py-4 flex flex-col items-center justify-center h-full">
              <span>ভাড়াটিয়ার এক কপি</span>
              <span className="mt-1">পাসপোর্ট সাইজ ছবি</span>
            </div>
          )}
        </div>

        {/* Center: Emblem, Title & Police Station */}
        <div className="flex-1 text-center pt-0 px-2 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-2.5 mb-1.5">
            <DhakaPoliceLogo size={56} className="w-14 h-14 inline-block" />
            <h1 className="text-xl sm:text-[23px] font-extrabold tracking-tight text-black inline-block">
              ঢাকা মেট্রোপলিটন পুলিশ
            </h1>
          </div>

          <div className="text-xs sm:text-[13px] font-medium space-y-1 mt-0.5 text-black">
            <div className="flex items-center justify-center gap-1">
              <span className="font-semibold">বিভাগ :</span>
              <div className="tenant-dotted-field border-b border-dotted border-black/80 px-2 min-w-[150px] inline-flex justify-center items-end pb-[3px] min-h-[22px]">
                <span className="tenant-dotted-value font-bold text-black leading-normal mb-[1px]">{displayDivision}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1">
              <span className="font-semibold">থানা :</span>
              <div className="tenant-dotted-field border-b border-dotted border-black/80 px-2 min-w-[150px] inline-flex justify-center items-end pb-[3px] min-h-[22px]">
                <span className="tenant-dotted-value font-bold text-black leading-normal mb-[1px]">{displayThana}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 mb-1">
            <h2
              className="text-base sm:text-[18px] font-extrabold inline-block text-black px-4 tracking-wide"
              style={{
                borderBottom: '3px double #000000',
                paddingBottom: '6px',
              }}
            >
              ভাড়াটিয়া নিবন্ধন ফরম
            </h2>
          </div>
        </div>

        {/* Right: Flat / Holding Information Box */}
        <div className="w-[205px] border-[1.5px] border-black rounded-[12px] overflow-hidden text-[11px] leading-snug flex-shrink-0 bg-white shadow-sm">
          <div className="divide-y divide-slate-300">
            <div className="flex items-start justify-between py-1 px-2 gap-1.5">
              <span className="font-semibold text-black whitespace-nowrap flex-shrink-0">ফ্ল্যাট/তলা :</span>
              <span className="font-bold text-black text-right break-words leading-snug">{displayFlatFloor}</span>
            </div>
            <div className="flex items-start justify-between py-1 px-2 gap-1.5">
              <span className="font-semibold text-black whitespace-nowrap flex-shrink-0">বাড়ী/হোল্ডিং :</span>
              <span className="font-bold text-black text-right break-words leading-snug">{displayHouseHolding}</span>
            </div>
            <div className="flex items-start justify-between py-1 px-2 gap-1.5">
              <span className="font-semibold text-black whitespace-nowrap flex-shrink-0">রাস্তা :</span>
              <span className="font-bold text-black text-right break-words leading-snug">{displayRoad}</span>
            </div>
            <div className="flex items-start justify-between py-1 px-2 gap-1.5">
              <span className="font-semibold text-black whitespace-nowrap flex-shrink-0">এলাকা :</span>
              <span className="font-bold text-black text-right break-words leading-snug">{displayArea}</span>
            </div>
            <div className="flex items-start justify-between py-1 px-2 gap-1.5">
              <span className="font-semibold text-black whitespace-nowrap flex-shrink-0">পোস্ট কোড :</span>
              <span className="font-bold text-black text-right break-words leading-snug">{displayPostCode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. BODY FORM FIELDS (১ to ১৭) */}
      {/* Clean text baseline spacing elevated above dotted lines */}
      {/* ============================================================== */}
      <div className="text-[12.5px] sm:text-[13px] text-black space-y-2">
        {/* Item 1 */}
        <div className="flex items-end">
          <span className="font-semibold whitespace-nowrap text-black">১. ভাড়াটিয়া/বাড়ীওয়ালার নাম :</span>
          <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
            <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap mb-[1px]">
              {fullName}
            </span>
          </div>
        </div>

        {/* Item 2 */}
        <div className="flex items-end">
          <span className="font-semibold whitespace-nowrap text-black">২. পিতার নাম :</span>
          <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
            <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap mb-[1px]">
              {fatherName}
            </span>
          </div>
        </div>

        {/* Item 3 */}
        <div className="flex items-end gap-3">
          <div className="flex items-end flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap text-black">৩. জন্ম তারিখ :</span>
            <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
              <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap mb-[1px]">
                {dob}
              </span>
            </div>
          </div>
          <div className="flex items-end w-[240px]">
            <span className="font-semibold whitespace-nowrap text-black">বৈবাহিক অবস্থা :</span>
            <div className="tenant-dotted-field flex-1 justify-center border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
              <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap text-center mb-[1px]">
                {maritalStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Item 4 */}
        <div className="flex items-end">
          <span className="font-semibold whitespace-nowrap text-black">৪. স্থায়ী ঠিকানা :</span>
          <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
            <span className="tenant-dotted-value font-medium text-black leading-normal whitespace-nowrap mb-[1px]">
              {permanentAddress}
            </span>
          </div>
        </div>

        {/* Item 5 */}
        <div className="flex items-end">
          <span className="font-semibold whitespace-nowrap text-black">৫. পেশা ও প্রতিষ্ঠান/কর্মস্থলের ঠিকানা :</span>
          <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
            <span className="tenant-dotted-value font-medium text-black leading-normal whitespace-nowrap mb-[1px]">
              {occupationAndWorkplace}
            </span>
          </div>
        </div>

        {/* Item 6 */}
        <div className="flex items-end gap-3">
          <div className="flex items-end flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap text-black">৬. ধর্ম :</span>
            <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
              <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap mb-[1px]">
                {religion}
              </span>
            </div>
          </div>
          <div className="flex items-end flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap text-black">শিক্ষাগত যোগ্যতা :</span>
            <div className="tenant-dotted-field flex-1 justify-center border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
              <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap text-center mb-[1px]">
                {educationalQualification}
              </span>
            </div>
          </div>
        </div>

        {/* Item 7 */}
        <div className="flex items-end gap-3">
          <div className="flex items-end flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap text-black">৭. মোবাইল নম্বর :</span>
            <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
              <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap tracking-wider mb-[1px]">
                {phone}
              </span>
            </div>
          </div>
          <div className="flex items-end flex-1 min-w-0">
            <span className="font-semibold whitespace-nowrap text-black">ই-মেইল আইডি :</span>
            <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
              <span className="tenant-dotted-value font-medium text-black leading-normal whitespace-nowrap mb-[1px]">
                {email}
              </span>
            </div>
          </div>
        </div>

        {/* Item 8 */}
        <div className="flex items-end">
          <span className="font-semibold whitespace-nowrap text-black">৮. জাতীয় পরিচয়পত্র নম্বর :</span>
          <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
            <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap tracking-wider mb-[1px]">
              {nidNumber}
            </span>
          </div>
        </div>

        {/* Item 9 */}
        <div className="flex items-end">
          <span className="font-semibold whitespace-nowrap text-black">৯. পাসপোর্ট নম্বর (যদি থাকে) :</span>
          <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[22px] flex items-end pb-[3px] overflow-hidden">
            <span className="tenant-dotted-value font-medium text-black leading-normal whitespace-nowrap tracking-wider mb-[1px]">
              {passportNumber}
            </span>
          </div>
        </div>

        {/* Item 10 */}
        <div className="space-y-1.5 pt-0.5">
          <div className="font-semibold text-black">১০. জরুরী যোগাযোগ :</div>
          <div className="grid grid-cols-2 gap-3 pl-3">
            <div className="flex items-end min-w-0">
              <span className="font-medium whitespace-nowrap text-black">(ক) নাম :</span>
              <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[21px] flex items-end pb-[3px] overflow-hidden">
                <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap mb-[1px]">
                  {emergencyName}
                </span>
              </div>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-medium whitespace-nowrap text-black">(খ) সম্পর্ক :</span>
              <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[21px] flex items-end pb-[3px] overflow-hidden">
                <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap mb-[1px]">
                  {emergencyRelation}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pl-3">
            <div className="flex items-end min-w-0">
              <span className="font-medium whitespace-nowrap text-black">(গ) ঠিকানা :</span>
              <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[21px] flex items-end pb-[3px] overflow-hidden">
                <span className="tenant-dotted-value font-medium text-black leading-normal whitespace-nowrap mb-[1px]">
                  {emergencyAddress}
                </span>
              </div>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-medium whitespace-nowrap text-black">(ঘ) মোবাইল নম্বর :</span>
              <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[21px] flex items-end pb-[3px] overflow-hidden">
                <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap tracking-wider mb-[1px]">
                  {emergencyPhone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Item 11: Table for Roommates / Mess Mates */}
        <div className="space-y-1.5 pt-1">
          <div className="font-semibold text-black">১১. পরিবার / মেসের সঙ্গীয় সদস্যদের বিবরণ :</div>
          <div className="w-full overflow-hidden border border-black rounded-[4px]">
            <table className="w-full text-center border-collapse text-[11.5px]">
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
                    className="border-b border-black last:border-b-0 h-7 text-black hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-1 px-1 border-r border-black font-semibold text-center">{m.sl}</td>
                    <td className="py-1 px-2 border-r border-black text-left font-medium truncate max-w-[200px]">
                      {m.name}
                    </td>
                    <td className="py-1 px-2 border-r border-black">{m.age}</td>
                    <td className="py-1 px-2 border-r border-black text-left truncate max-w-[120px]">
                      {m.occupation}
                    </td>
                    <td className="py-1 px-2 font-mono text-center tracking-wide">{m.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Item 12 */}
        <div className="space-y-1.5 pt-0.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">১২. গৃহকর্মীর নাম :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">জাতীয় পরিচয়পত্র নং :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pl-4">
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">মোবাইল নম্বর :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">স্থায়ী ঠিকানা :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
          </div>
        </div>

        {/* Item 13 */}
        <div className="space-y-1.5 pt-0.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">১৩. ড্রাইভারের নাম :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">জাতীয় পরিচয়পত্র নং :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pl-4">
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">মোবাইল নম্বর :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">স্থায়ী ঠিকানা :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
          </div>
        </div>

        {/* Item 14 */}
        <div className="space-y-1.5 pt-0.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">১৪. পূর্ববর্তী বাড়িওয়ালার নাম :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-semibold whitespace-nowrap text-black">মোবাইল নম্বর :</span>
              <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
            </div>
          </div>
          <div className="flex items-end pl-4">
            <span className="font-semibold whitespace-nowrap text-black">ঠিকানা :</span>
            <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
          </div>
        </div>

        {/* Item 15 */}
        <div className="flex items-end pt-0.5">
          <span className="font-semibold whitespace-nowrap text-black">১৫. পূর্ববর্তী বাসা ছাড়ার কারণ :</span>
          <div className="flex-1 border-b border-dotted border-black/80 ml-1.5 min-h-[21px]"></div>
        </div>

        {/* Item 16: Fixed Landlord Name & Phone as specifically required */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <div className="flex items-end min-w-0">
            <span className="font-semibold whitespace-nowrap text-black">১৬. বর্তমান বাড়িওয়ালার নাম :</span>
            <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[21px] flex items-end pb-[3px] overflow-hidden">
              <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap mb-[1px]">
                {FIXED_LANDLORD_NAME}
              </span>
            </div>
          </div>
          <div className="flex items-end min-w-0">
            <span className="font-semibold whitespace-nowrap text-black">মোবাইল নম্বর :</span>
            <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[21px] flex items-end pb-[3px] overflow-hidden">
              <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap tracking-wider mb-[1px]">
                {FIXED_LANDLORD_PHONE}
              </span>
            </div>
          </div>
        </div>

        {/* Item 17 */}
        <div className="flex items-end pt-0.5">
          <span className="font-semibold whitespace-nowrap text-black">১৭. বর্তমান বাড়ীতে কোন তারিখ থেকে বসবাস :</span>
          <div className="tenant-dotted-field flex-1 border-b border-dotted border-black/80 ml-1.5 px-1 min-h-[21px] flex items-end pb-[3px] overflow-hidden">
            <span className="tenant-dotted-value font-bold text-black leading-normal whitespace-nowrap mb-[1px]">
              {displayAllotmentDate}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SIGNATURE & FOOTER SECTION */}
      {/* ============================================================== */}
      <div className="mt-7 pt-3 flex items-end justify-between text-xs sm:text-[13px] text-black">
        <div className="min-w-[160px] text-center">
          <div className="tenant-dotted-field border-b border-dotted border-black/80 mb-1 pb-[3px] flex justify-center items-end min-h-[22px]">
            <span className="tenant-dotted-value font-bold text-black leading-normal mb-[1px]">
              {displayToday}
            </span>
          </div>
          <div className="font-semibold text-black">তারিখ</div>
        </div>

        <div className="min-w-[200px] text-center">
          <div className="border-b border-dotted border-black/80 mb-1 pb-0.5 h-6"></div>
          <div className="font-semibold text-black">ভাড়াটিয়ার স্বাক্ষর</div>
        </div>
      </div>

      <div className="mt-4 text-center text-[11px] sm:text-[11.5px] font-bold text-black border-t border-slate-300 pt-2">
        বিঃদ্রঃ এই ফরমের একটি কপি বাড়ির মালিক অবশ্যই সংরক্ষণ করবেন।
      </div>
    </div>
  )
}

export default TenantPoliceForm
