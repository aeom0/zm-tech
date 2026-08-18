/**
 * Slug URL-safe a partir del nombre de tienda.
 * Vacío si el nombre no deja caracteres útiles (letras/números).
 */
export function slugify(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
