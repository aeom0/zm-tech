/**
 * Hook para subir/reemplazar el logo del tenant al bucket `tenant-logos`.
 *
 * Retorna:
 *  - uploading: boolean
 *  - uploadLogo(uri: string): Promise<{ ok: boolean; url?: string; error?: string }>
 */
import { useState } from "react";
import * as ImageManipulator from "expo-image-manipulator";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const BUCKET = "tenant-logos";
const MAX_SIZE = 512; // px

export function useLogoUpload() {
  const { userId } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadLogo = async (
    uri: string,
  ): Promise<{ ok: boolean; url?: string; error?: string }> => {
    if (!userId) return { ok: false, error: "Sin usuario autenticado" };
    setUploading(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: MAX_SIZE, height: MAX_SIZE } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.WEBP },
      );

      const response = await fetch(manipulated.uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const filePath = `${userId}/logo.webp`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, uint8Array, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) return { ok: false, error: uploadError.message };

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      return { ok: true, url: publicUrl };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      return { ok: false, error: msg };
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadLogo };
}
