import { Modal } from './Modal'

/**
 * 删除作品的二次确认弹窗。删除不可撤销，必须先确认。
 */
export interface DeleteConfirmDialogProps {
  /** 待删作品名（为 null 时弹窗关闭）。 */
  name: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirmDialog({ name, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <Modal
      open={name !== null}
      onClose={onCancel}
      title="确定删除这个作品吗？"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[40px] items-center rounded-pill border border-sky-200 bg-white px-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-[40px] items-center rounded-pill bg-error px-5 text-sm font-semibold text-white transition hover:brightness-110 active:translate-y-px"
          >
            删除
          </button>
        </>
      }
    >
      「{name}」删除后无法找回。
    </Modal>
  )
}
