'use client'

import { useState } from 'react'

import { supabase } from '@/lib/supabase'

export type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export type UploadKind = 'image' | 'audio' | 'document'

interface UploadRules {
  allowedTypes: string[]
  maxFileSize: number
  errorMessage: string
}

const UPLOAD_RULES: Record<UploadKind, UploadRules> = {
  image: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024,
    errorMessage: 'Solo se permiten imágenes JPG, PNG o WebP de hasta 5 MB.',
  },
  audio: {
    allowedTypes: ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr', 'audio/webm'],
    maxFileSize: 16 * 1024 * 1024,
    errorMessage: 'Solo se permiten audios OGG, MP3, M4A, AAC o AMR de hasta 16 MB.',
  },
  document: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxFileSize: 25 * 1024 * 1024,
    errorMessage: 'Solo se permiten documentos PDF, Word o Excel de hasta 25 MB.',
  },
}

export interface UseImageUploadResult {
  uploadState: UploadState
  uploadError: string | null
  uploadImage: (file: File, bucket: string, path: string, kind?: UploadKind) => Promise<string>
  resetUpload: () => void
}

export function useImageUpload(): UseImageUploadResult {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const resetUpload = () => {
    setUploadState('idle')
    setUploadError(null)
  }

  const uploadImage = async (
    file: File,
    bucket: string,
    path: string,
    kind: UploadKind = 'image'
  ): Promise<string> => {
    if (!supabase) throw new Error('Supabase no está configurado')

    const rules = UPLOAD_RULES[kind]
    if (!rules.allowedTypes.includes(file.type) || file.size > rules.maxFileSize) {
      setUploadError(rules.errorMessage)
      setUploadState('error')
      throw new Error(rules.errorMessage)
    }

    setUploadError(null)
    setUploadState('uploading')

    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })

    if (error) {
      setUploadState('error')
      setUploadError(error.message ?? 'Error al subir el archivo')
      throw error
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
    const publicUrl = urlData?.publicUrl ?? ''

    setUploadState('success')
    setTimeout(() => setUploadState('idle'), 2000)

    return publicUrl
  }

  return { uploadState, uploadError, uploadImage, resetUpload }
}
