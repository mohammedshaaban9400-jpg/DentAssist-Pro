import { useState, useCallback, type ReactNode } from 'react'
import { ConfirmModal } from '@/components/ConfirmModal'

type Options = {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type State = {
  open: boolean
  message: string
  opts: Options
  resolve: ((v: boolean) => void) | null
}

/**
 * Drop-in replacement for window.confirm() that uses a styled React modal
 * instead of a native browser dialog. This avoids Electron focus issues
 * that cause input fields to become unresponsive after a native dialog closes.
 *
 * Usage:
 *   const { confirm, confirmModal } = useConfirm()
 *   ...
 *   const ok = await confirm('Are you sure?')
 *   if (!ok) return
 */
export function useConfirm() {
  const [state, setState] = useState<State>({
    open: false,
    message: '',
    opts: {},
    resolve: null,
  })

  const confirm = useCallback(
    (message: string, opts?: Options): Promise<boolean> =>
      new Promise((resolve) => {
        setState({ open: true, message, opts: opts ?? {}, resolve })
      }),
    [],
  )

  const handleConfirm = useCallback(() => {
    setState((s) => {
      s.resolve?.(true)
      return { ...s, open: false, resolve: null }
    })
  }, [])

  const handleCancel = useCallback(() => {
    setState((s) => {
      s.resolve?.(false)
      return { ...s, open: false, resolve: null }
    })
  }, [])

  const confirmModal: ReactNode = (
    <ConfirmModal
      open={state.open}
      message={state.message}
      title={state.opts.title}
      confirmLabel={state.opts.confirmLabel}
      cancelLabel={state.opts.cancelLabel}
      danger={state.opts.danger ?? true}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return { confirm, confirmModal }
}
