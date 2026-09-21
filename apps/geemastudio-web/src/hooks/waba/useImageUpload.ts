'use client'

import { useState } from 'react'

import { supabase } from '@/lib/supabase'

export type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export interface UseImageUploadResult {
  uploadState: UploadState
  uploadError: string | null
  uploadImage: (file: File, bucket: string, path: string) => Promise<string>
  resetUpload: () => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function useImageUpload(): UseImageUploadResult {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const resetUpload = () => {
    setUploadState('idle')
    setUploadError(null)
  }

  const uploadImage = async (file: File, bucket: string, path: string): Promise<string> => {
    if (!supabase) throw new Error('Supabase no está configurado')

    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      const msg = 'Solo se permiten imágenes JPG, PNG o WebP de hasta 5 MB.'
      setUploadError(msg)
      setUploadState('error')
      throw new Error(msg)
    }

    setUploadError(null)
    setUploadState('uploading')

    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })

    if (error) {
      setUploadState('error')
      setUploadError(error.message ?? 'Error al subir la imagen')
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
