/** Common dental / primary-care medications for quick pick (AR + EN labels). */
export type MedicationSuggestion = { id: string; labelAr: string; labelEn: string }

export const MEDICATION_SUGGESTIONS: MedicationSuggestion[] = [
  { id: 'amoxicillin', labelAr: 'أموكسيسيلين 500 مجم', labelEn: 'Amoxicillin 500 mg' },
  { id: 'amoxicillin_clav', labelAr: 'أموكسيسيلين + حمض كلافولانيك', labelEn: 'Amoxicillin + clavulanic acid' },
  { id: 'metronidazole', labelAr: 'ميترونيدازول 400 مجم', labelEn: 'Metronidazole 400 mg' },
  { id: 'clindamycin', labelAr: 'كلندامايسين 300 مجم', labelEn: 'Clindamycin 300 mg' },
  { id: 'ibuprofen', labelAr: 'إيبوبروفين 400 مجم', labelEn: 'Ibuprofen 400 mg' },
  { id: 'paracetamol', labelAr: 'باراسيتامول 500 مجم', labelEn: 'Paracetamol 500 mg' },
  { id: 'chlorhexidine', labelAr: 'غسول كلورهيكسيدين 0.2٪', labelEn: 'Chlorhexidine mouthwash 0.2%' },
  { id: 'fluoride', labelAr: 'معجون فلورايد عالي', labelEn: 'High-fluoride toothpaste/gel' },
  { id: 'diclofenac', labelAr: 'ديكلوفيناك 50 مجم', labelEn: 'Diclofenac 50 mg' },
  { id: 'azithromycin', labelAr: 'أزيثرومايسين 500 مجم', labelEn: 'Azithromycin 500 mg' },
]

export function suggestionLabel(lang: string, s: MedicationSuggestion): string {
  return lang === 'ar' ? s.labelAr : s.labelEn
}
