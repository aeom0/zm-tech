// ============================================================
// Inventario — tabla, filtros y edición en Sheet
// ============================================================

'use client'

import { useCallback, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Pencil, Search } from 'lucide-react'
import { POPULAR_BRANDS } from '@repmax/repmax-schema'
import { useAuth } from '@/context/AuthContext'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { createClient } from '@/lib/supabase/client'
import { patchProduct } from '@/lib/repmax-queries'
import { getSiteUrl } from '@/lib/site-url'
import { urlProductoVitrina } from '@/lib/storefront-url'
import type { FiltroMlWeb } from '@/lib/ml-readiness'
import { MlBadgeChip } from '@/components/dashboard/MlBadgeChip'
import { VitrinaPanel } from '@/components/dashboard/VitrinaPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ProductoWeb } from '@/types/dashboard'

const selectClase =
  'min-w-[120px] shrink-0 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]'

const TIPOS_VEHICULO: { value: string; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'CAR', label: 'Carro' },
  { value: 'MOTO', label: 'Moto' },
  { value: 'TRUCK', label: 'Camión' },
  { value: 'SUV', label: 'SUV' },
]

const ML_FILTROS: { value: FiltroMlWeb; label: string }[] = [
  { value: 'para_ml', label: 'Para ML' },
  { value: 'listo', label: 'Listo ML' },
  { value: 'incompleto', label: 'ML incompleto' },
  { value: 'exportado', label: 'Exportado' },
  { value: 'en_ml', label: 'En ML' },
  { value: 'listo_vitrina', label: 'Listo vitrina' },
]

const CONDICIONES: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'NEW', label: 'Nuevo' },
  { value: 'USED', label: 'Usado' },
]

interface RespuestaProductos {
  products: ProductoWeb[]
  total: number
  page: number
  limit: number
}

function EsqueletoInventario() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 rounded-lg bg-[#1A1A1A]" />
      <div className="h-96 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
    </div>
  )
}

export default function InventoryPage() {
  const { token, store } = useAuth()
  const [marca, setMarca] = useState('')
  const [condicion, setCondicion] = useState('')
  const [tipoVehiculo, setTipoVehiculo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [soloStockBajo, setSoloStockBajo] = useState(false)
  const [mlFilter, setMlFilter] = useState<FiltroMlWeb>('')
  const [pagina, setPagina] = useState(1)
  const limite = 20

  const url = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(pagina))
    p.set('limit', String(limite))
    if (marca) p.set('brand', marca)
    if (condicion) p.set('condition', condicion)
    if (tipoVehiculo) p.set('vehicleType', tipoVehiculo)
    if (busqueda.trim()) p.set('q', busqueda.trim())
    if (soloStockBajo) p.set('lowStock', 'true')
    if (mlFilter) p.set('mlFilter', mlFilter)
    return `/api/products?${p.toString()}`
  }, [marca, condicion, tipoVehiculo, busqueda, soloStockBajo, mlFilter, pagina, limite])

  const { data, isLoading, error, refetch } = useAuthFetch<RespuestaProductos>(url)

  const [editando, setEditando] = useState<ProductoWeb | null>(null)
  const [precioUsd, setPrecioUsd] = useState('')
  const [stockVal, setStockVal] = useState('')
  const [minStockVal, setMinStockVal] = useState('')
  const [activo, setActivo] = useState(true)
  const [barcodeVal, setBarcodeVal] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const abrirEdicion = useCallback((p: ProductoWeb) => {
    setEditando(p)
    setPrecioUsd(String(p.priceUsd))
    setStockVal(String(p.stock))
    setMinStockVal(String(p.minStock))
    setActivo(p.isActive)
    setBarcodeVal(p.barcode ?? '')
    setErrorForm(null)
  }, [])

  const guardar = useCallback(async () => {
    if (!editando || !token) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const priceUsd = Number(precioUsd.replace(',', '.'))
      const stock = Number(stockVal)
      const minStock = Number(minStockVal)
      if (!Number.isFinite(priceUsd) || !Number.isFinite(stock) || !Number.isFinite(minStock)) {
        throw new Error('Revisa los números ingresados')
      }
      const client = createClient()
      await patchProduct(
        client,
        editando.id,
        {
          priceUsd,
          stock: Math.floor(stock),
          minStock: Math.floor(minStock),
          isActive: activo,
          barcode: barcodeVal.trim(),
        },
        store?.usdBsRate ?? 36.5
      )
      setEditando(null)
      await refetch()
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }, [
    editando,
    token,
    precioUsd,
    stockVal,
    minStockVal,
    activo,
    barcodeVal,
    refetch,
    store?.usdBsRate,
  ])

  if (isLoading && !data) {
    return <EsqueletoInventario />
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-[#F44336]/40 bg-[#1A1A1A] p-6 text-[#F44336]">
        {error}
      </div>
    )
  }

  const productos = data?.products ?? []
  const total = data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / limite))

  return (
    <div className="space-y-4">
      <VitrinaPanel />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#616161]" />
          <Input
            placeholder="Buscar repuesto o código…"
            value={busqueda}
            onChange={(e) => {
              setPagina(1)
              setBusqueda(e.target.value)
            }}
            className="border-[#2A2A2A] bg-[#242424] pl-9 text-[#F5F5F5] placeholder:text-[#616161] focus-visible:ring-[#FF6B00]"
          />
        </div>
        <select
          className={selectClase}
          value={marca}
          onChange={(e) => {
            setPagina(1)
            setMarca(e.target.value)
          }}
        >
          <option value="">Todas las marcas</option>
          {POPULAR_BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className={selectClase}
          value={condicion}
          onChange={(e) => {
            setPagina(1)
            setCondicion(e.target.value)
          }}
        >
          {CONDICIONES.map((c) => (
            <option key={c.value || 'all'} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className={selectClase}
          value={tipoVehiculo}
          onChange={(e) => {
            setPagina(1)
            setTipoVehiculo(e.target.value)
          }}
        >
          {TIPOS_VEHICULO.map((t) => (
            <option key={t.value || 'all'} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className={selectClase}
          value={mlFilter}
          onChange={(e) => {
            setPagina(1)
            setMlFilter(e.target.value as FiltroMlWeb)
          }}
          aria-label="Filtro ML / vitrina"
        >
          <option value="">ML / vitrina</option>
          {ML_FILTROS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#9E9E9E]">
          <input
            type="checkbox"
            checked={soloStockBajo}
            onChange={(e) => {
              setPagina(1)
              setSoloStockBajo(e.target.checked)
            }}
            className="h-4 w-4 rounded border-[#2A2A2A] bg-[#242424] text-[#FF6B00] focus:ring-[#FF6B00]"
          />
          Stock bajo
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
        <Table>
          <TableHeader className="bg-[#242424]">
            <TableRow className="border-[#2A2A2A] hover:bg-transparent">
              <TableHead className="w-12">Foto</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Marca / Modelo</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Condición</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((p, idx) => (
              <TableRow
                key={p.id}
                className={cn(
                  'border-[#2A2A2A] hover:bg-[#242424]/30',
                  idx % 2 === 1 ? 'bg-[#1E1E1E]/80' : 'bg-[#1A1A1A]',
                  !p.isActive && 'opacity-50'
                )}
              >
                <TableCell>
                  {p.photos?.[0] ? (
                    <Image
                      src={p.photos[0]}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded bg-[#242424] object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-[#242424]" />
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] font-medium text-[#F5F5F5]">
                  <span className="line-clamp-2">{p.title}</span>
                  {p.partNumber ? (
                    <span className="text-xs text-[#616161]">#{p.partNumber}</span>
                  ) : null}
                  {p.barcode ? (
                    <span className="block text-xs text-[#616161]">{p.barcode}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-[#9E9E9E]">
                  {p.brand} / {p.model}
                </TableCell>
                <TableCell className="whitespace-nowrap text-[#FF6B00]">
                  ${p.priceUsd.toFixed(2)}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      p.stock <= 0
                        ? 'font-semibold text-[#F44336]'
                        : p.stock <= p.minStock
                          ? 'font-semibold text-[#FFC107]'
                          : 'text-[#F5F5F5]'
                    }
                  >
                    {p.stock}
                  </span>
                  <span className="text-xs text-[#616161]"> / min {p.minStock}</span>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      p.condition === 'NEW'
                        ? 'rounded-md bg-[#4CAF50]/20 px-2 py-0.5 text-xs text-[#4CAF50]'
                        : 'rounded-md bg-[#9E9E9E]/20 px-2 py-0.5 text-xs text-[#9E9E9E]'
                    }
                  >
                    {p.condition === 'NEW' ? 'Nuevo' : 'Usado'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {p.mlBadge ? <MlBadgeChip kind={p.mlBadge} /> : null}
                    {p.vitrinaLista ? (
                      <Badge className="border-transparent bg-[#2196F3]/20 text-[10px] text-[#2196F3]">
                        Listo vitrina
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-[#9E9E9E]">
                  {p.isActive ? 'Activo' : 'Inactivo'}
                </TableCell>
                <TableCell className="text-right">
                  {store?.slug && p.isActive && p.stock > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-[#9E9E9E] hover:bg-[#242424] hover:text-[#2196F3]"
                      asChild
                    >
                      <Link
                        href={urlProductoVitrina(getSiteUrl(), store.slug, p.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Ver en vitrina"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-[#9E9E9E] hover:bg-[#242424] hover:text-[#FF6B00]"
                    onClick={() => abrirEdicion(p)}
                    aria-label="Editar producto"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {productos.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#9E9E9E]">
            No hay productos con esos filtros.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#9E9E9E]">
        <span>
          Página {pagina} de {totalPaginas} — {total} productos
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#2A2A2A] bg-[#1A1A1A] text-[#F5F5F5] hover:bg-[#242424]"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#2A2A2A] bg-[#1A1A1A] text-[#F5F5F5] hover:bg-[#242424]"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <Sheet open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent side="right" className="border-[#2A2A2A] bg-[#1A1A1A]">
          <SheetHeader>
            <SheetTitle className="pr-8">Editar producto</SheetTitle>
            <p className="line-clamp-2 text-sm text-[#9E9E9E]">{editando?.title}</p>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceUsd" className="text-[#F5F5F5]">
                Precio USD
              </Label>
              <Input
                id="priceUsd"
                value={precioUsd}
                onChange={(e) => setPrecioUsd(e.target.value)}
                className="border-[#2A2A2A] bg-[#242424] text-[#F5F5F5] focus-visible:ring-[#FF6B00]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock" className="text-[#F5F5F5]">
                Stock
              </Label>
              <Input
                id="stock"
                type="number"
                value={stockVal}
                onChange={(e) => setStockVal(e.target.value)}
                className="border-[#2A2A2A] bg-[#242424] text-[#F5F5F5] focus-visible:ring-[#FF6B00]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock" className="text-[#F5F5F5]">
                Stock mínimo
              </Label>
              <Input
                id="minStock"
                type="number"
                value={minStockVal}
                onChange={(e) => setMinStockVal(e.target.value)}
                className="border-[#2A2A2A] bg-[#242424] text-[#F5F5F5] focus-visible:ring-[#FF6B00]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode" className="text-[#F5F5F5]">
                Código de barras / QR
              </Label>
              <Input
                id="barcode"
                value={barcodeVal}
                onChange={(e) => setBarcodeVal(e.target.value)}
                placeholder="EAN, Code128 o payload QR"
                className="border-[#2A2A2A] bg-[#242424] text-[#F5F5F5] focus-visible:ring-[#FF6B00]"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#F5F5F5]">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="h-4 w-4 rounded border-[#2A2A2A] bg-[#242424] text-[#FF6B00] focus:ring-[#FF6B00]"
              />
              Activo en catálogo
            </label>
            {errorForm ? <p className="text-sm text-[#F44336]">{errorForm}</p> : null}
            <Button
              type="button"
              className="w-full bg-[#FF6B00] font-semibold text-[#0D0D0D] hover:bg-[#FF8533]"
              disabled={guardando}
              onClick={() => void guardar()}
            >
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
