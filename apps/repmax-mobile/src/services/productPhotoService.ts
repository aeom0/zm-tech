// ============================================================
// Fotos de producto: picker, resize 1200² y upload a Storage
// ============================================================
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'

import { supabase } from '../utils/supabase'
import { ML_PHOTO } from '../utils/mlPhotoRules'

const BUCKET = 'repmax-products'

async function pesoBytes(uri: string): Promise<number> {
  const response = await fetch(uri)
  const buffer = await response.arrayBuffer()
  return buffer.byteLength
}

export interface AssetFoto {
  uri: string
  width: number
  height: number
  fileSize?: number | null
  mimeType?: string | null
}

async function pedirPermisoCamara(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  return status === 'granted'
}

async function pedirPermisoGaleria(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  return status === 'granted'
}

function aAsset(result: ImagePicker.ImagePickerSuccessResult): AssetFoto | null {
  const asset = result.assets[0]
  if (!asset) return null
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize ?? null,
    mimeType: asset.mimeType ?? null,
  }
}

const OPCIONES_PICKER: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.9,
}

export const productPhotoService = {
  async abrirCamara(): Promise<AssetFoto | null> {
    const ok = await pedirPermisoCamara()
    if (!ok) {
      throw new Error('Necesitamos la cámara para fotos de portada. Actívala en Ajustes.')
    }
    const result = await ImagePicker.launchCameraAsync(OPCIONES_PICKER)
    if (result.canceled) return null
    return aAsset(result)
  },

  async abrirGaleria(): Promise<AssetFoto | null> {
    const ok = await pedirPermisoGaleria()
    if (!ok) {
      throw new Error('Necesitamos acceso a tus fotos para subir imágenes de productos.')
    }
    const result = await ImagePicker.launchImageLibraryAsync(OPCIONES_PICKER)
    if (result.canceled) return null
    return aAsset(result)
  },

  /** Recorte ya es 1:1; baja a 1200 si viene más grande y confirma ≤ 5 MB. */
  async prepararParaMl(uri: string, width: number, height: number): Promise<string> {
    const lado = Math.min(width, height)
    const target = Math.min(ML_PHOTO.idealPx, lado)
    // Sin expo-file-system (no está en el APK preview). fetch sobre file:// basta.
    const CALIDADES = [0.85, 0.7, 0.5] as const
    let ultimaUri = uri

    for (const compress of CALIDADES) {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: target, height: target } }],
        { compress, format: ImageManipulator.SaveFormat.JPEG }
      )
      ultimaUri = manipulated.uri
      const peso = await pesoBytes(ultimaUri)
      if (peso <= ML_PHOTO.maxBytes) return ultimaUri
    }

    throw new Error('La foto sigue pesando mucho después de comprimir. Prueba con otra.')
  },

  async subir(storeId: string, localUri: string): Promise<string> {
    const response = await fetch(localUri)
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const filePath = `${storeId}/drafts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`

    const { error } = await supabase.storage.from(BUCKET).upload(filePath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    return data.publicUrl
  },

  esUriLocal(uri: string): boolean {
    return uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('ph://')
  },
}
