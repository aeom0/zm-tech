// Contrato para alerta post-POS: productos vendidos que siguen en ML.
// La detección va por DB (mlListingService.findPublishedOnMlForSale), no por cache del carrito.

export interface ItemAlertaMlStock {
  productId: string;
  title: string;
  partNumber?: string;
  mlItemId?: string;
}
