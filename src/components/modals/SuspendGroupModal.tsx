import { useMemo } from 'react'

import { useProjectsStore } from '../../stores/projectsStore'
import { useUiStore } from '../../stores/uiStore'
import { Modal } from './Modal'
import controls from './controls.module.css'

export function SuspendGroupModal() {
  const open = useUiStore((s) => s.openModal === 'suspendGroup')
  const context = useUiStore((s) => s.modalContext) as { groupId?: string } | null
  const closeModal = useUiStore((s) => s.closeModal)
  const suspendGroup = useProjectsStore((s) => s.suspendGroup)
  const groups = useProjectsStore((s) => s.groups)
  const projects = useProjectsStore((s) => s.projects)

  const group = useMemo(
    () => (context?.groupId ? groups.find((g) => g.id === context.groupId) ?? null : null),
    [context?.groupId, groups],
  )

  const { terminalCount, activeCount } = useMemo(() => {
    if (!group) return { terminalCount: 0, activeCount: 0 }
    const groupProjects = projects.filter((p) => group.projectIds.includes(p.id))
    return {
      terminalCount: groupProjects.reduce((sum, p) => sum + p.terminals.length, 0),
      activeCount: groupProjects.reduce(
        (sum, p) => sum + p.terminals.filter((t) => !t.disabled).length,
        0,
      ),
    }
  }, [group, projects])

  if (!group) return null

  const onConfirm = () => {
    suspendGroup(group.id)
    closeModal()
  }

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Suspender grupo"
      footer={
        <>
          <button type="button" className={controls.btn} onClick={closeModal}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${controls.btn} ${controls.btnDanger}`}
            onClick={onConfirm}
          >
            Suspender
          </button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.5, margin: '0 0 12px' }}>
        Tem certeza que deseja suspender o grupo{' '}
        <strong style={{ color: group.color }}>{group.name}</strong>?
      </p>
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5, margin: 0 }}>
        Isso vai desabilitar {activeCount > 0 ? <strong>{activeCount}</strong> : '0'} terminal
        {activeCount !== 1 ? 'is' : ''} ativo{activeCount !== 1 ? 's' : ''} (de {terminalCount}{' '}
        total) e fechar os containers da workspace. Os processos (PTYs) serão encerrados pra liberar
        RAM. Você pode reativar o grupo a qualquer momento pelo menu de contexto.
      </p>
    </Modal>
  )
}
