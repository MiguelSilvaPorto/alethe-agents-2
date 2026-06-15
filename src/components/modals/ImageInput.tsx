import { Upload, X } from 'lucide-react'
import { useRef } from 'react'

import controls from './controls.module.css'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export type ImageInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  onEnter?: () => void
}

export function ImageInput({
  label,
  value,
  onChange,
  placeholder = 'https://exemplo.com/icone.png',
  hint,
  onEnter,
}: ImageInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const pickImage = () => fileInputRef.current?.click()

  const onFileChange = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      window.alert('Escolha um arquivo de imagem.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      window.alert('Imagem muito grande. Use uma imagem de até 2 MB.')
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    onChange(dataUrl)
  }

  return (
    <div className={controls.field}>
      <label className={controls.label}>{label}</label>
      <div className={controls.inputActionRow}>
        <input
          className={controls.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        />
        <button
          type="button"
          className={controls.iconBtn}
          onClick={pickImage}
          title="Escolher imagem local"
          aria-label="Escolher imagem local"
        >
          <Upload size={14} />
        </button>
        {value ? (
          <button
            type="button"
            className={controls.iconBtn}
            onClick={() => onChange('')}
            title="Remover imagem"
            aria-label="Remover imagem"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          void onFileChange(e.target.files?.[0])
          e.currentTarget.value = ''
        }}
      />
      {hint ? <span className={controls.hint}>{hint}</span> : null}
    </div>
  )
}
