/// <reference types="vite/client" />

export type DbInvokePayload =
  | { op: 'getConfig'; key: string }
  | { op: 'setConfig'; key: string; value: string }
  | { op: 'getConfigs'; keys: string[] }
  | { op: 'verifyCredentials'; username: string; password: string }
  | { op: 'listUsers' }
  | { op: 'createUser'; username: string; role: 'doctor' | 'receptionist'; pin: string }
  | { op: 'updateUserPin'; id: number; pin: string }
  | { op: 'updateUsername'; id: number; username: string }
  | { op: 'deleteUser'; id: number }
  | { op: 'setLicenseActive' }
  | { op: 'listPatients'; query?: string }
  | { op: 'getPatient'; id: number }
  | {
      op: 'createPatient'
      firstName: string
      lastName: string
      dob: string | null
      gender: string | null
      phone: string | null
      medicalHistory: string | null
    }
  | {
      op: 'updatePatient'
      id: number
      firstName: string
      lastName: string
      dob: string | null
      gender: string | null
      phone: string | null
      medicalHistory: string | null
    }
  | { op: 'deletePatient'; id: number }
  | { op: 'listTeethStatuses'; patientId: number }
  | {
      op: 'upsertTeethStatus'
      patientId: number
      toothNumber: number
      status: string
      notes: string | null
      preparationDepthMm: number | null
    }
  | { op: 'listAppointments'; fromIso: string | null; toIso: string | null }
  | {
      op: 'createAppointment'
      patientId: number
      startTime: string
      endTime: string
      status: string
      notes: string | null
    }
  | {
      op: 'updateAppointment'
      id: number
      patientId: number
      startTime: string
      endTime: string
      status: string
      notes: string | null
    }
  | { op: 'deleteAppointment'; id: number }
  | { op: 'listDueWhatsAppReminders'; nowIso: string }
  | { op: 'markAppointmentReminderSent'; appointmentId: number; reminderType: '24h' | '2h' }
  | { op: 'listTreatmentPlans'; patientId: number }
  | { op: 'createTreatmentPlan'; patientId: number; title: string; diagnosis: string | null; notes: string | null }
  | { op: 'updateTreatmentPlan'; id: number; title: string; diagnosis: string | null; notes: string | null; status: 'draft' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' }
  | { op: 'acceptTreatmentPlan'; id: number; acceptedByName: string; signatureText: string }
  | { op: 'deleteTreatmentPlan'; id: number }
  | { op: 'listTreatmentPlanStages'; planId: number }
  | {
      op: 'createTreatmentPlanStage'
      planId: number
      stageOrder: number
      title: string
      description: string | null
      estimatedCost: number
      paidAmount: number
      status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      appointmentId: number | null
      dueDate: string | null
    }
  | {
      op: 'updateTreatmentPlanStage'
      id: number
      stageOrder: number
      title: string
      description: string | null
      estimatedCost: number
      paidAmount: number
      status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      appointmentId: number | null
      dueDate: string | null
    }
  | { op: 'deleteTreatmentPlanStage'; id: number }
  | { op: 'listInvoices'; limit?: number; patientId?: number | null }
  | { op: 'listInvoiceLinesExport' }
  | { op: 'getInvoice'; id: number }
  | {
      op: 'createInvoice'
      patientId: number
      date: string
      status: 'paid' | 'pending'
      items: { description: string; toothNumber: number | null; price: number }[]
    }
  | { op: 'updateInvoiceStatus'; id: number; status: 'paid' | 'pending' }
  | {
      op: 'updateInvoiceWithItems'
      id: number
      date: string
      status: 'paid' | 'pending'
      items: { description: string; toothNumber: number | null; price: number }[]
    }
  | { op: 'deleteInvoice'; id: number }
  | { op: 'listPrescriptions'; patientId: number }
  | {
      op: 'createPrescription'
      patientId: number
      doctorId: number
      date: string
      medicationsJson: string
      notes: string | null
    }
  | {
      op: 'updatePrescription'
      id: number
      patientId: number
      doctorId: number
      date: string
      medicationsJson: string
      notes: string | null
    }
  | { op: 'deletePrescription'; id: number }
  | { op: 'listPatientImages'; patientId: number }
  | {
      op: 'createPatientImage'
      patientId: number
      imagePath: string
      type: 'before' | 'after'
      date: string
      notes: string | null
      toothNumber: number | null
    }
  | { op: 'deletePatientImage'; id: number }
  | { op: 'getDashboardStats' }
  | { op: 'getDailyReports' }
  | { op: 'listDistributors'; query?: string }
  | {
      op: 'createDistributor'
      name: string
      company: string
      phone: string
      address: string
      items: string
      paymentAmount: number
      remainingAmount: number
    }
  | {
      op: 'updateDistributor'
      id: number
      name: string
      company: string
      phone: string
      address: string
      items: string
      paymentAmount: number
      remainingAmount: number
    }
  | { op: 'deleteDistributor'; id: number }
  | { op: 'listTransactions'; query?: string }
  | {
      op: 'createTransaction'
      date: string
      description: string
      type: 'income' | 'expense'
      amount: number
      currency: string
    }
  | { op: 'deleteTransaction'; id: number }
  | { op: 'listLabOrders'; query?: string }
  | {
      op: 'createLabOrder'
      patientName: string
      labName: string
      workType: string
      sentDate: string
      status: 'progress' | 'received' | 'delayed'
    }
  | { op: 'updateLabOrderStatus'; id: number; status: 'progress' | 'received' | 'delayed' }
  | { op: 'deleteLabOrder'; id: number }
  | { op: 'listOrthodonticCases'; patientId?: number; status?: string; query?: string }
  | { op: 'getOrthodonticCase'; id: number }
  | {
      op: 'createOrthodonticCase'
      patientId: number
      startDate: string
      estimatedDurationMonths?: number
      status?: 'active' | 'retention' | 'completed' | 'suspended'
      classification?: string
      applianceType?: string
      archType?: 'upper' | 'lower' | 'both'
      extractionPlan?: string | null
      chiefComplaint?: string | null
      diagnosisNotes?: string | null
      totalCost?: number
      downPayment?: number
      monthlyInstallment?: number
      retainerType?: string | null
    }
  | {
      op: 'updateOrthodonticCase'
      id: number
      startDate?: string
      estimatedDurationMonths?: number
      status?: 'active' | 'retention' | 'completed' | 'suspended'
      classification?: string
      applianceType?: string
      archType?: 'upper' | 'lower' | 'both'
      extractionPlan?: string | null
      chiefComplaint?: string | null
      diagnosisNotes?: string | null
      totalCost?: number
      downPayment?: number
      monthlyInstallment?: number
      retainerType?: string | null
    }
  | { op: 'deleteOrthodonticCase'; id: number }
  | { op: 'listOrthodonticVisits'; caseId: number }
  | {
      op: 'createOrthodonticVisit'
      caseId: number
      visitDate: string
      upperWire?: string | null
      lowerWire?: string | null
      elasticPrescription?: string | null
      actionsJson?: string | null
      brokenBracketsCount?: number
      oralHygieneRating?: number
      painLevel?: number
      amountPaid?: number
      notes?: string | null
      nextAppointmentDate?: string | null
    }
  | {
      op: 'updateOrthodonticVisit'
      id: number
      upperWire?: string | null
      lowerWire?: string | null
      elasticPrescription?: string | null
      actionsJson?: string | null
      brokenBracketsCount?: number
      oralHygieneRating?: number
      painLevel?: number
      amountPaid?: number
      notes?: string | null
      nextAppointmentDate?: string | null
    }
  | { op: 'deleteOrthodonticVisit'; id: number }
  | { op: 'getOrthodonticStats' }

  // Dental Implants
  | { op: 'listDentalImplants'; patientId?: number; status?: string; query?: string }
  | { op: 'getDentalImplant'; id: number }
  | {
      op: 'createDentalImplant'
      patientId: number
      toothNumber: number
      brand: string
      model?: string | null
      diameterMm: number
      lengthMm: number
      lotNumber?: string | null
      serialNumber?: string | null
      insertionTorqueNcm?: number | null
      isqValue?: number | null
      boneGraftType?: string | null
      membraneUsed?: number
      sinusLift?: string | null
      placementDate: string
      healingPeriodMonths?: number
      targetLoadingDate?: string | null
      healingAbutmentDate?: string | null
      healingAbutmentSize?: string | null
      finalLoadingDate?: string | null
      prostheticType?: string | null
      status?: string
      notes?: string | null
    }
  | {
      op: 'updateDentalImplant'
      id: number
      toothNumber?: number
      brand?: string
      model?: string | null
      diameterMm?: number
      lengthMm?: number
      lotNumber?: string | null
      serialNumber?: string | null
      insertionTorqueNcm?: number | null
      isqValue?: number | null
      boneGraftType?: string | null
      membraneUsed?: number
      sinusLift?: string | null
      placementDate?: string
      healingPeriodMonths?: number
      targetLoadingDate?: string | null
      healingAbutmentDate?: string | null
      healingAbutmentSize?: string | null
      finalLoadingDate?: string | null
      prostheticType?: string | null
      status?: string
      notes?: string | null
    }
  | { op: 'deleteDentalImplant'; id: number }

  // Dental Stock & Inventory
  | { op: 'listInventoryItems'; category?: string; query?: string; lowStockOnly?: boolean; expiringSoon?: boolean }
  | { op: 'getInventoryItem'; id: number }
  | {
      op: 'createInventoryItem'
      name: string
      category: string
      specification?: string | null
      quantity: number
      unit: string
      minThreshold: number
      costPerUnit: number
      distributorId?: number | null
      expiryDate?: string | null
      batchNumber?: string | null
      location?: string | null
      notes?: string | null
    }
  | {
      op: 'updateInventoryItem'
      id: number
      name?: string
      category?: string
      specification?: string | null
      quantity?: number
      unit?: string
      minThreshold?: number
      costPerUnit?: number
      distributorId?: number | null
      expiryDate?: string | null
      batchNumber?: string | null
      location?: string | null
      notes?: string | null
    }
  | { op: 'adjustInventoryQuantity'; id: number; delta: number }
  | { op: 'deleteInventoryItem'; id: number }
  | { op: 'getInventoryStats' }

  // Treatment Catalog
  | { op: 'listTreatmentCatalog'; category?: string; query?: string; activeOnly?: boolean }
  | {
      op: 'createTreatmentCatalogItem'
      category: string
      code?: string | null
      nameAr: string
      nameEn: string
      defaultCost: number
      description?: string | null
      durationMinutes?: number
      isActive?: number
    }
  | {
      op: 'updateTreatmentCatalogItem'
      id: number
      category?: string
      code?: string | null
      nameAr?: string
      nameEn?: string
      defaultCost?: number
      description?: string | null
      durationMinutes?: number
      isActive?: number
    }
  | { op: 'deleteTreatmentCatalogItem'; id: number }

export type DentAssistApi = {
  /** True only in packaged Electron preload (not browser dev mock). */
  isElectronShell?: boolean
  getMachineId: () => Promise<string>
  getPaths: () => Promise<{ userData: string; imagesDir: string; logosDir: string; dbPath: string }>
  db: (payload: DbInvokePayload) => Promise<unknown>
  openExternal: (url: string) => Promise<boolean>
  saveClinicLogo: (fileBuffer: ArrayBuffer, ext: string) => Promise<string>
  resolveAssetPath: (relativePath: string) => Promise<string>
  readUserDataFileBase64: (relativePath: string) => Promise<string>
  savePatientImage: (patientId: number, fileBuffer: ArrayBuffer, ext: string) => Promise<string>
  exportEncryptedBackup: (passphrase: string) => Promise<{ ok: true; filePath: string } | { ok: false }>
  importEncryptedBackup: (passphrase: string) => Promise<{ ok: true } | { ok: false }>
  /** Returns encrypted backup payload string for cloud sync */
  getEncryptedBackupString?: (passphrase: string) => Promise<string>
  /** Restores encrypted backup payload string from cloud sync */
  applyEncryptedBackupString?: (encrypted: string, passphrase: string) => Promise<{ ok: true }>
  /** Web/PWA: restore from a File already chosen in the UI (reliable on mobile). */
  importEncryptedBackupFromFile?: (file: File, passphrase: string) => Promise<{ ok: true }>
  /** Google Drive desktop folder sync */
  selectFolderDialog?: () => Promise<string | null>
  detectGoogleDriveFolder?: () => Promise<string | null>
  saveBackupToFolder?: (folderPath: string, passphrase: string) => Promise<{ ok: true; fileName: string; filePath: string; size: number; createdTime: string }>
  listBackupsInFolder?: (folderPath: string) => Promise<Array<{ name: string; path: string; size: number; createdTime: string; modifiedTime?: string }>>
  restoreBackupFromFilePath?: (filePath: string, passphrase: string) => Promise<{ ok: true }>
  openFolderInExplorer?: (folderPath: string) => Promise<boolean>
  /** Save UTF-8 text (e.g. CSV) via system dialog; returns ok:false if user cancels. */
  saveTextFile?: (defaultFileName: string, content: string) => Promise<{ ok: true; filePath: string } | { ok: false }>
  windowMinimize?: () => Promise<void>
  windowToggleMaximize?: () => Promise<{ maximized: boolean }>
  windowClose?: () => Promise<void>
}

declare global {
  interface Window {
    dentassist?: DentAssistApi
  }
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_TARGET: 'web' | 'desktop'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.wasm?url' {
  const url: string
  export default url
}
