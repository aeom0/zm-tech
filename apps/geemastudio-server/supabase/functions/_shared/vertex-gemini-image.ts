/**
 * Vertex AI — Gemini image (edición conversacional / semantic inpainting).
 * Imagen 3 mask-based está deprecado; usamos prompt + imagen de referencia.
 */

import {
  getGoogleAccessToken,
  getGoogleProjectId,
  parseGoogleServiceAccount,
} from "./gcp-auth.ts";

const DEFAULT_MODEL = "gemini-3.1-flash-image";
const DEFAULT_LOCATION = "global";

/** gemini-3.1-flash-image (vía Vertex global) tiende a devolver collages/grids sin esto. */
const SINGLE_IMAGE_LOCK =
  "OUTPUT FORMAT (mandatory): Return exactly ONE single photorealistic image — the full original selfie framing with the edit applied. Do NOT create a collage, grid, before/after split, cropped zoom panel, or any composite with multiple sub-images. Do NOT stack or duplicate the face. One image, one framing, matching the original selfie's composition exactly.";

export interface VertexImageEditInput {
  /** Selfie u origen en bytes */
  imageBytes: Uint8Array;
  mimeType?: string;
  /** Prompt de edición (semantic masking) */
  prompt: string;
  /** Imagen de referencia de estilo (portafolio), opcional */
  referenceImageBytes?: Uint8Array;
  referenceMimeType?: string;
  model?: string;
  location?: string;
}

export interface VertexImageEditResult {
  imageBytes: Uint8Array;
  mimeType: string;
  model: string;
  /** Texto auxiliar del modelo, si lo devuelve */
  text?: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function vertexGenerateContentUrl(
  projectId: string,
  location: string,
  model: string,
): string {
  // gemini-3.1-flash-image (y otros modelos nuevos) solo sirven por el endpoint
  // global (sin prefijo de región en el host); us-central1/etc. siguen siendo
  // regionales para modelos como gemini-2.5-flash-image.
  const host = location === "global"
    ? "aiplatform.googleapis.com"
    : `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

/** Edita imagen vía Gemini en Vertex (selfie + prompt ± referencia de estilo). */
export async function vertexGeminiImageEdit(
  input: VertexImageEditInput,
): Promise<VertexImageEditResult> {
  const sa = parseGoogleServiceAccount();
  const projectId = getGoogleProjectId(sa);
  const location = input.location ?? Deno.env.get("GCP_LOCATION") ??
    DEFAULT_LOCATION;
  const model = input.model ?? Deno.env.get("GEMINI_IMAGE_MODEL") ??
    DEFAULT_MODEL;
  const mimeType = input.mimeType ?? "image/jpeg";

  const parts: Array<Record<string, unknown>> = [
    {
      inlineData: {
        mimeType,
        data: bytesToBase64(input.imageBytes),
      },
    },
  ];

  if (input.referenceImageBytes?.length) {
    parts.push({
      inlineData: {
        mimeType: input.referenceMimeType ?? "image/jpeg",
        data: bytesToBase64(input.referenceImageBytes),
      },
    });
  }

  parts.push({ text: input.prompt });

  const accessToken = await getGoogleAccessToken();
  const url = vertexGenerateContentUrl(projectId, location, model);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vertex Gemini image error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const candidates = data.candidates as
    | Array<{
      content?: { parts?: Array<Record<string, unknown>> };
    }>
    | undefined;

  let imageBytes: Uint8Array | null = null;
  let outMime = "image/png";
  let text: string | undefined;

  for (const part of candidates?.[0]?.content?.parts ?? []) {
    if (typeof part.text === "string") text = part.text;
    const inline = part.inlineData as
      | { data?: string; mimeType?: string }
      | undefined;
    if (inline?.data) {
      imageBytes = base64ToBytes(inline.data);
      if (inline.mimeType) outMime = inline.mimeType;
    }
  }

  if (!imageBytes?.length) {
    throw new Error("Vertex no devolvió imagen en la respuesta");
  }

  return { imageBytes, mimeType: outMime, model, text };
}

/** Prompt base Plan 06 — edición solo en pestañas (semantic masking). */
export function buildLookPreviewPrompt(style: string): string {
  const styleLabel = style.trim() || "Anime";
  return [
    SINGLE_IMAGE_LOCK,
    "Using the provided selfie photo of a woman's face, change ONLY the eyelash extensions",
    `to a professional salon-quality ${styleLabel} lash style.`,
    "Keep everything else exactly the same: skin tone, eye shape, iris color, eyebrows,",
    "makeup, hair, lighting, and background.",
    "The result must look natural and photorealistic, as if done at a beauty salon.",
    "Do not alter any facial features except adding/enhancing the eyelash extensions.",
    "Preserve the exact aspect ratio and framing of the selfie photo — do not adopt the aspect ratio of any reference image.",
  ].join(" ");
}
