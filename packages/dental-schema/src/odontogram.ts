export type ToothStatus =
  | "healthy"
  | "treated"
  | "to-treat"
  | "extracted"
  | "implant"
  | "crown"
  | "root-canal";

export type SurfaceStatus = "healthy" | "treated" | "to-treat";

export type ToothSurface =
  | "mesial"
  | "distal"
  | "occlusal"
  | "buccal"
  | "palatal";

/** Numeración FDI: 11–18, 21–28, 31–38, 41–48 */
export const FDI_TEETH = [
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
] as const;

export type FdiToothNumber = (typeof FDI_TEETH)[number];

export type OdontogramToothState = {
  status: ToothStatus;
  surfaces: Partial<Record<ToothSurface, SurfaceStatus>>;
  notes?: string;
  lastUpdated: string;
};

/** Snapshot por visita — cada clinical_record guarda su propia foto */
export type OdontogramState = Record<string, OdontogramToothState>;
