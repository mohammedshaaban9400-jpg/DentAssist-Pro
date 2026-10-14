import { useState, useEffect, useRef } from 'react'
import {
  Cloud,
  FolderSync,
  FolderOpen,
  FolderCheck,
  ShieldCheck,
  RefreshCw,
  Check,
  FolderArchive,
  Lock,
  HardDrive,
  FileUp,
  Settings,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import {
  detectSystemGoogleDriveFolder,
  formatBytes,
  getSavedDriveFolderPath,
  getLastDriveSyncTime,
  listBackupsInDriveFolder,
  openFolderInExplorer,
  restoreBackupFromDriveFile,
  saveBackupToDriveFolder,
  setSavedDriveFolderPath,
  type DesktopBackupFile,
} from '@/services/googleDriveService'
import { importDatabaseBackupEncryptedFromFile } from '@/services/dbService'

export function GoogleDriveSyncSection() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { push } = useToastStore()
  const { confirm, confirmModal } = useConfirm()

  const [folderPath, setFolderPath] = useState<string | null>(getSavedDriveFolderPath())
  const [detectedPath, setDetectedPath] = useState<string | null>(null)

  // Folder configuration modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [customPathInput, setCustomPathInput] = useState(folderPath || 'G:\\My Drive')

  // Upload state
  const [uploadPassphrase, setUploadPassphrase] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(getLastDriveSyncTime())

  // Backups modal state
  const [backupsModalOpen, setBackupsModalOpen] = useState(false)
  const [backups, setBackups] = useState<DesktopBackupFile[]>([])
  const [loadingBackups, setLoadingBackups] = useState(false)

  // Restore state (from folder)
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<DesktopBackupFile | null>(null)
  const [restorePassphrase, setRestorePassphrase] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)

  // Direct Folder Pick ref
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Direct File Pick state (for restoring directly from any file in Drive or PC)
  const directFileInputRef = useRef<HTMLInputElement>(null)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [fileRestoreModalOpen, setFileRestoreModalOpen] = useState(false)
  const [fileRestorePass, setFileRestorePass] = useState('')
  const [isFileRestoring, setIsFileRestoring] = useState(false)

  useEffect(() => {
    const saved = getSavedDriveFolderPath()
    setFolderPath(saved)
    setLastSync(getLastDriveSyncTime())

    // Auto-detect if not set yet
    if (!saved) {
      detectSystemGoogleDriveFolder()
        .then((detected) => {
          if (detected) {
            setDetectedPath(detected)
            setCustomPathInput(detected)
          }
        })
    }
  }, [])

  const handleSelectFolder = async () => {
    // 1. In Electron desktop app:
    const d = window.dentassist
    if (d?.selectFolderDialog) {
      try {
        const selected = await d.selectFolderDialog()
        if (selected) {
          setSavedDriveFolderPath(selected)
          setFolderPath(selected)
          setDetectedPath(null)
          setCustomPathInput(selected)
          push(
            isAr
              ? `تم ربط مجلد Google Drive بنجاح: ${selected}`
              : `Google Drive folder linked: ${selected}`,
            'success'
          )
          return
        }
      } catch (err) {
        console.warn('Native folder dialog error:', err)
      }
    }

    // 2. In Browser with File System Access API (Chrome / Edge):
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker({
          id: 'dentassist-gdrive-sync',
          mode: 'readwrite',
          startIn: 'desktop',
        })
        if (handle?.name) {
          const folderName = handle.name === 'My Drive' ? 'G:\\My Drive' : handle.name
          setSavedDriveFolderPath(folderName)
          setFolderPath(folderName)
          setDetectedPath(null)
          setCustomPathInput(folderName)
          push(
            isAr
              ? `تم اختيار مجلد Google Drive بنجاح: ${folderName}`
              : `Google Drive folder chosen: ${folderName}`,
            'success'
          )
          return
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        console.warn('showDirectoryPicker error:', err)
      }
    }

    // 3. Fallback: trigger native Windows folder selector via file input
    folderInputRef.current?.click()
  }

  const handleApplyCustomPath = (path: string) => {
    const trimmed = path.trim()
    if (!trimmed) {
      push(isAr ? 'يرجى إدخال مسار المجلد' : 'Please enter a folder path', 'error')
      return
    }
    setSavedDriveFolderPath(trimmed)
    setFolderPath(trimmed)
    setDetectedPath(null)
    setFolderModalOpen(false)
    push(isAr ? 'تم حفظ وتعيين مجلد Google Drive بنجاح' : 'Google Drive folder linked successfully', 'success')
  }

  const handleConfirmDetected = (path: string) => {
    setSavedDriveFolderPath(path)
    setFolderPath(path)
    setDetectedPath(null)
    push(isAr ? 'تم تأكيد مجلد Google Drive بنجاح' : 'Google Drive folder confirmed', 'success')
  }

  const handleDisconnectFolder = async () => {
    if (
      !(await confirm(
        isAr
          ? 'هل تريد إلغاء ربط مجلد Google Drive الحالي؟ لن تُحذف أي ملفات موجودة على حاسوبك.'
          : 'Do you want to disconnect the current Google Drive folder? Your local files will remain intact.',
        { danger: true }
      ))
    ) {
      return
    }

    setSavedDriveFolderPath(null)
    setFolderPath(null)
    push(isAr ? 'تم إلغاء ربط المجلد' : 'Folder disconnected', 'info')
  }

  const handleOpenInExplorer = async () => {
    if (!folderPath) return
    const opened = await openFolderInExplorer(folderPath)
    if (opened) {
      push(
        isAr ? 'تم فتح المجلد في مستعرض ملفات ويندوز' : 'Folder opened in File Explorer',
        'success'
      )
    } else {
      // Browser environment fallback: open Google Drive web & copy path
      window.open('https://drive.google.com/drive/my-drive', '_blank')
      try {
        await navigator.clipboard.writeText(folderPath)
        push(
          isAr
            ? `أنت تستخدم المتصفح: تم فتح Google Drive، ونُسخ مسار المجلد (${folderPath}) إلى الحافظة.`
            : `In browser: Opened Google Drive web. Copied path (${folderPath}) to clipboard.`,
          'info'
        )
      } catch {
        push(
          isAr
            ? 'أنت تستخدم المتصفح: تم فتح Google Drive على الويب.'
            : 'In browser: Opened Google Drive on web.',
          'info'
        )
      }
    }
  }

  const handleUploadBackup = async () => {
    if (!folderPath) {
      push(isAr ? 'يرجى تحديد مجلد Google Drive أولاً' : 'Please select a Google Drive folder first', 'error')
      return
    }

    if (uploadPassphrase.length < 8) {
      push(t('settings.backupPassHint'), 'error')
      return
    }

    setIsUploading(true)
    try {
      const result = await saveBackupToDriveFolder(folderPath, uploadPassphrase)
      setUploadPassphrase('')
      setLastSync(new Date().toISOString())
      push(
        isAr
          ? `تم حفظ النسخة المشفرة في مجلد Google Drive بنجاح (${formatBytes(result.size)}) — جاري مزامنتها سحابياً!`
          : `Encrypted backup saved to Google Drive folder (${formatBytes(result.size)}) — syncing now!`,
        'success'
      )
    } catch (err: any) {
      push(err?.message || String(err), 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleOpenBackupsModal = async () => {
    if (!folderPath) return
    setBackupsModalOpen(true)
    setLoadingBackups(true)
    try {
      const list = await listBackupsInDriveFolder(folderPath)
      setBackups(list)
    } catch (err: any) {
      push(err?.message || String(err), 'error')
    } finally {
      setLoadingBackups(false)
    }
  }

  const handleConfirmRestore = async () => {
    if (!selectedBackupForRestore) return
    if (restorePassphrase.length < 8) {
      push(t('settings.backupPassHint'), 'error')
      return
    }

    if (
      !(await confirm(
        isAr
          ? 'تنبيه أمان هام: ستؤدي الاستعادة إلى استبدال قاعدة بيانات العيادة الحالية بالكامل بالنسخة المختارة. هل تريد المتابعة؟'
          : 'Security Warning: Restoring will completely replace the current clinic database with the selected backup. Continue?',
        { danger: true }
      ))
    ) {
      return
    }

    setIsRestoring(true)
    try {
      await restoreBackupFromDriveFile(selectedBackupForRestore.path, restorePassphrase)
      push(
        isAr
          ? 'تم استيراد النسخة بنجاح! جاري إعادة تشغيل التطبيق...'
          : 'Backup restored successfully! Restarting app...',
        'success'
      )
      setSelectedBackupForRestore(null)
      setBackupsModalOpen(false)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      push(err?.message || String(err), 'error')
    } finally {
      setIsRestoring(false)
    }
  }

  // Handle direct file selection
  const handleDirectFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPickedFile(file)
      setFileRestorePass('')
      setFileRestoreModalOpen(true)
    }
    // reset input so picking the same file again triggers change
    if (e.target) e.target.value = ''
  }

  const handleConfirmDirectFileRestore = async () => {
    if (!pickedFile) return
    if (fileRestorePass.length < 8) {
      push(t('settings.backupPassHint'), 'error')
      return
    }

    if (
      !(await confirm(
        isAr
          ? 'تنبيه أمان: ستؤدي استعادة هذا الملف إلى استبدال قاعدة بيانات العيادة الحالية بالكامل. هل تريد المتابعة؟'
          : 'Security Warning: Restoring this file will overwrite the current database entirely. Continue?',
        { danger: true }
      ))
    ) {
      return
    }

    setIsFileRestoring(true)
    try {
      await importDatabaseBackupEncryptedFromFile(pickedFile, fileRestorePass)
      push(
        isAr
          ? 'تمت استعادة النسخة بنجاح! جاري تحديث الصفحة...'
          : 'Backup restored successfully! Reloading page...',
        'success'
      )
      setFileRestoreModalOpen(false)
      setPickedFile(null)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      push(err?.message || String(err), 'error')
    } finally {
      setIsFileRestoring(false)
    }
  }

  const passOk = uploadPassphrase.length >= 8

  return (
    <>
      {/* Hidden file input for direct file picking */}
      <input
        ref={directFileInputRef}
        type="file"
        accept=".dentassist,application/octet-stream,*/*"
        className="hidden"
        onChange={handleDirectFileSelected}
      />

      {/* Hidden native folder input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        // @ts-ignore
        directory=""
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) {
            const rel = files[0].webkitRelativePath
            const rootName = rel ? rel.split('/')[0] : 'Google Drive'
            const finalPath = rootName === 'My Drive' ? 'G:\\My Drive' : rootName
            setSavedDriveFolderPath(finalPath)
            setFolderPath(finalPath)
            setDetectedPath(null)
            setCustomPathInput(finalPath)
            push(
              isAr
                ? `تم ربط مجلد Google Drive بنجاح: ${finalPath}`
                : `Google Drive folder linked: ${finalPath}`,
              'success'
            )
          }
          if (e.target) e.target.value = ''
        }}
      />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-emerald-500 to-amber-500 p-0.5 shadow-sm">
              <div className="flex size-full items-center justify-center rounded-[10px] bg-white">
                <Cloud className="size-5 text-blue-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  {isAr ? 'المزامنة مع حساب Google Drive على حاسوبك' : 'Google Drive Direct Desktop Sync'}
                </h3>
                {folderPath ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {isAr ? 'متصل' : 'Connected'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    <span className="size-1.5 rounded-full bg-slate-400" />
                    {isAr ? 'غير متصل' : 'Not Connected'}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {isAr
                  ? 'حفظ النسخ المشفرة مباشرة في مجلد Google Drive على حاسوبك ليقوم برنامج Google Drive برفعها ومزامنتها تلقائياً مع حسابك.'
                  : 'Saves encrypted backups directly into your local Google Drive folder, allowing Google Drive app to sync them seamlessly.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => directFileInputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              title={isAr ? 'اختيار واستعادة ملف نسخة احتياطية من القرص أو Drive مباشرة' : 'Choose and restore a backup file directly'}
            >
              <FileUp className="size-3.5 text-blue-600" />
              <span>{isAr ? 'اختيار ملف نسخة من الحاسوب' : 'Pick Backup File'}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 p-6">
          {/* Security & Explanation Note */}
          <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-600" />
            <div className="text-xs leading-relaxed text-teal-900">
              <span className="font-bold">
                {isAr ? 'مزامنة تلقائية بدون أي تعقيد تقني أو حسابات مطورين: ' : 'Effortless Automatic Sync: '}
              </span>
              {isAr
                ? 'لا تحتاج إلى أي اشتراك برمجي أو دخول إلى Google Console. فقط اختر مجلد Google Drive الموجود على حاسوبك، وسيتولى البرنامج حفظ النسخ المشفرة محلياً بينما يتكفل Google Drive بمزامنتها مع هاتفك وحسابك السحابي فوراً.'
                : 'No developer credentials or Google Cloud Console required. Simply select your local Google Drive folder on this PC, and backups will sync silently to your Google account.'}
            </div>
          </div>

          {/* Auto-detected suggestion banner */}
          {detectedPath && !folderPath && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="flex items-center gap-3">
                <FolderCheck className="size-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-900">
                    {isAr ? 'تم اكتشاف مجلد Google Drive تلقائياً على حاسوبك:' : 'Google Drive folder detected on your PC:'}
                  </p>
                  <code className="text-[11px] font-mono text-blue-800">{detectedPath}</code>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleConfirmDetected(detectedPath)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Check className="size-3.5" />
                {isAr ? 'تأكيد واستخدام هذا المجلد' : 'Use This Folder'}
              </button>
            </div>
          )}

          {/* Folder not connected state */}
          {!folderPath ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                <FolderSync className="size-6 text-blue-600" />
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-800">
                {isAr ? 'تحديد مجلد Google Drive على جهازك' : 'Select Google Drive Folder on Your Computer'}
              </h4>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                {isAr
                  ? 'اختر مجلد Google Drive الخاص بك (مثلاً: القرص G:\\My Drive أو المجلد الذي تزامن معه على الحاسوب) لتفعيل الحفظ والاستعادة بضغطة زر واحدة.'
                  : 'Pick your Google Drive folder on this PC (e.g. G:\\My Drive or your synced folder) to enable 1-click cloud sync.'}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
                >
                  <FolderOpen className="size-4 text-blue-400" />
                  {isAr ? 'اختيار مجلد Google Drive الآن' : 'Choose Google Drive Folder'}
                </button>

                <button
                  type="button"
                  onClick={() => directFileInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
                >
                  <FileUp className="size-4 text-teal-600" />
                  {isAr ? 'اختيار ملف نسخة احتياطية مباشرة' : 'Pick Backup File Directly'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected folder info */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-sm">
                    <HardDrive className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800">
                        {isAr ? 'المجلد المتصل على الحاسوب:' : 'Connected Local Folder:'}
                      </p>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        Google Drive
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-mono text-slate-600 break-all">{folderPath}</p>
                    {lastSync ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {t('settings.gdriveLastSync')}: {new Date(lastSync).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenInExplorer}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    title={isAr ? 'فتح المجلد في مستعرض الملفات' : 'Open in Explorer'}
                  >
                    <FolderOpen className="size-3.5 text-slate-500" />
                    <span>{isAr ? 'فتح في مستعرض الملفات' : 'Open in Explorer'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenBackupsModal}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
                  >
                    <FolderArchive className="size-3.5" />
                    <span>{isAr ? 'استعراض النسخ المحفوظة' : 'Browse Backups'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomPathInput(folderPath || 'G:\\My Drive')
                      setFolderModalOpen(true)
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <Settings className="size-3.5 text-slate-400" />
                    <span>{isAr ? 'تغيير المجلد' : 'Change'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectFolder}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
                  >
                    {isAr ? 'إلغاء الربط' : 'Disconnect'}
                  </button>
                </div>
              </div>

              {/* Upload to Google Drive Section */}
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Cloud className="size-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-800">
                    {isAr ? 'حفظ نسخة احتياطية في Google Drive الآن' : 'Save Backup to Google Drive Now'}
                  </h4>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-slate-500">
                  {isAr
                    ? 'سيتم تشفير كافة بيانات العيادة وصور الأشعة بكلمة مرورك، وحفظها مباشرة داخل مجلد Google Drive ليرفعها تطبيق Google Drive تلقائياً إلى حسابك السحابي.'
                    : 'Clinic database and images will be encrypted with your password and saved directly to your Google Drive folder for immediate cloud sync.'}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative max-w-sm flex-1">
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={uploadPassphrase}
                      onChange={(e) => setUploadPassphrase(e.target.value)}
                      className="da-input cursor-text font-mono"
                      placeholder={t('settings.backupPass')}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isUploading || !passOk}
                    onClick={handleUploadBackup}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>{t('common.loading')}</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="size-4" />
                        <span>{isAr ? 'حفظ ومزامنة مع Google Drive' : 'Save & Sync to Google Drive'}</span>
                      </>
                    )}
                  </button>
                </div>

                {uploadPassphrase.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (uploadPassphrase.length / 12) * 100)}%`,
                          background: passOk ? '#10b981' : uploadPassphrase.length >= 6 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <span className={`text-[11px] font-medium ${passOk ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {passOk ? `✓ ${t('settings.backupPassHint')}` : t('settings.backupPassHint')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Folder Selection & Presets Modal ── */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="size-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">
                  {isAr ? 'تحديد مجلد Google Drive على جهازك' : 'Specify Google Drive Folder on PC'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFolderModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 p-6 text-xs text-slate-600">
              <p className="leading-relaxed">
                {isAr
                  ? 'اختر مجلداً من المسارات الشائعة أدناه بنقرة واحدة، أو اكتب المسار الدقيق لمجلد Google Drive على حاسوبك:'
                  : 'Select one of the common paths below or enter the exact path to your Google Drive folder on this PC:'}
              </p>

              {/* Quick Presets */}
              <div>
                <label className="mb-2 block font-bold text-slate-700">
                  {isAr ? 'خيارات سريعة بنقرة واحدة:' : 'Quick One-Click Presets:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomPathInput('G:\\My Drive')}
                    className={`flex items-center justify-between rounded-xl border p-3 text-right transition ${
                      customPathInput === 'G:\\My Drive'
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-bold'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-mono text-xs">G:\My Drive</p>
                      <p className="text-[10px] text-slate-500">{isAr ? 'الافتراضي لـ Google Drive' : 'Default Drive'}</p>
                    </div>
                    {customPathInput === 'G:\\My Drive' && <Check className="size-4 text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomPathInput('G:\\')}
                    className={`flex items-center justify-between rounded-xl border p-3 text-right transition ${
                      customPathInput === 'G:\\'
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-bold'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-mono text-xs">G:\</p>
                      <p className="text-[10px] text-slate-500">{isAr ? 'قرص Google Drive بالكامل' : 'Whole Drive G:'}</p>
                    </div>
                    {customPathInput === 'G:\\' && <Check className="size-4 text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomPathInput('Google Drive')}
                    className={`flex items-center justify-between rounded-xl border p-3 text-right transition ${
                      customPathInput === 'Google Drive'
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-bold'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-mono text-xs">Google Drive</p>
                      <p className="text-[10px] text-slate-500">{isAr ? 'المجلد المحلي' : 'Local folder'}</p>
                    </div>
                    {customPathInput === 'Google Drive' && <Check className="size-4 text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomPathInput('OneDrive')}
                    className={`flex items-center justify-between rounded-xl border p-3 text-right transition ${
                      customPathInput === 'OneDrive'
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-bold'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-mono text-xs">OneDrive</p>
                      <p className="text-[10px] text-slate-500">{isAr ? 'مجلد ون درايف' : 'OneDrive folder'}</p>
                    </div>
                    {customPathInput === 'OneDrive' && <Check className="size-4 text-blue-600" />}
                  </button>
                </div>
              </div>

              {/* Manual Input */}
              <div className="pt-2">
                <label className="mb-1.5 block font-bold text-slate-700">
                  {isAr ? 'أو اكتب / عدّل المسار:' : 'Or enter custom path:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPathInput}
                    onChange={(e) => setCustomPathInput(e.target.value)}
                    placeholder="مثال: G:\My Drive\DentAssist"
                    className="da-input font-mono text-xs flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => setFolderModalOpen(false)}
                className="da-btn-secondary text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleApplyCustomPath(customPathInput)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Check className="size-3.5" />
                {isAr ? 'حفظ واستخدام هذا المجلد' : 'Save & Use Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Direct File Restore Modal ── */}
      {fileRestoreModalOpen && pickedFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <FileUp className="size-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-800">
                  {isAr ? 'استيراد واستعادة ملف النسخة الاحتياطية' : 'Restore Backup File'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFileRestoreModalOpen(false)
                  setPickedFile(null)
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 p-6 text-xs text-slate-600">
              <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3.5">
                <p className="font-bold text-teal-900">{isAr ? 'الملف المختار:' : 'Selected File:'}</p>
                <p className="mt-1 font-mono text-teal-800 break-all">{pickedFile.name}</p>
                <p className="mt-0.5 text-[11px] text-teal-700">{formatBytes(pickedFile.size)}</p>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-slate-700">
                  {t('settings.backupPass')}:
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={fileRestorePass}
                  onChange={(e) => setFileRestorePass(e.target.value)}
                  placeholder={t('settings.backupPassHint')}
                  className="da-input font-mono text-xs w-full"
                />
              </div>

              <p className="text-[11px] text-amber-700 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                {isAr
                  ? 'تنبيه: سيتم استبدال كامل قاعدة بيانات العيادة الحالية بمحتويات هذا الملف بعد فك تشفيره.'
                  : 'Notice: Restoring will overwrite the current clinic database completely.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                disabled={isFileRestoring}
                onClick={() => {
                  setFileRestoreModalOpen(false)
                  setPickedFile(null)
                }}
                className="da-btn-secondary text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={isFileRestoring || fileRestorePass.length < 8}
                onClick={handleConfirmDirectFileRestore}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
              >
                {isFileRestoring ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>{isAr ? 'تأكيد واستعادة الآن' : 'Confirm & Restore'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Browse & Restore Backups Modal ── */}
      {backupsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <FolderArchive className="size-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">
                  {isAr ? 'النسخ الاحتياطية في مجلد Google Drive' : 'Backups in Google Drive Folder'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBackupsModalOpen(false)
                  setSelectedBackupForRestore(null)
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingBackups ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <RefreshCw className="size-6 animate-spin text-blue-600" />
                  <p className="mt-3 text-xs">{t('common.loading')}</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                  <Cloud className="mx-auto size-8 text-slate-300" />
                  <p className="mt-2 text-xs">
                    {isAr
                      ? 'لا توجد نسخ احتياطية محفوظة داخل هذا المجلد حتى الآن.'
                      : 'No backup files found in this folder yet.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {backups.map((file) => (
                    <div
                      key={file.path}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-slate-50/70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Lock className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 font-mono">
                            {file.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-500">
                            <span>
                              {new Date(file.createdTime).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                            </span>
                            <span>•</span>
                            <span className="font-mono">{formatBytes(file.size)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBackupForRestore(file)
                            setRestorePassphrase('')
                          }}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                        >
                          <Check className="size-3.5" />
                          {isAr ? 'استعادة هذه النسخة' : 'Restore'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Restore Confirmation Block */}
              {selectedBackupForRestore && (
                <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                    <Check className="size-4 text-teal-600" />
                    <span>
                      {isAr
                        ? `استعادة: ${selectedBackupForRestore.name}`
                        : `Restore: ${selectedBackupForRestore.name}`}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-teal-800">
                    {t('settings.gdriveRestoreConfirm')}
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="password"
                      autoComplete="off"
                      value={restorePassphrase}
                      onChange={(e) => setRestorePassphrase(e.target.value)}
                      placeholder={t('settings.backupPass')}
                      className="da-input max-w-xs font-mono text-xs"
                    />
                    <button
                      type="button"
                      disabled={isRestoring || restorePassphrase.length < 8}
                      onClick={handleConfirmRestore}
                      className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>{t('common.loading')}</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-3.5" />
                          <span>{isAr ? 'تأكيد واستعادة الآن' : 'Confirm & Restore'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={() => setSelectedBackupForRestore(null)}
                      className="da-btn-secondary text-xs"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <span className="text-[11px] text-slate-500">
                {isAr
                  ? `إجمالي النسخ: ${backups.length}`
                  : `Total backups: ${backups.length}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setBackupsModalOpen(false)
                  setSelectedBackupForRestore(null)
                }}
                className="da-btn-secondary text-xs"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </>
  )
}
