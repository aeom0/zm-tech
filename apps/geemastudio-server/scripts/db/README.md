# Scripts de Base de Datos

Scripts SQL para inicializar y poblar la base de datos de ZM Lash & Nails Beauty.

## 📋 Scripts Disponibles

### `seed-services.sql`
Pobla el catálogo completo de servicios del salón según **LISTA DE PRECIOS ZM**.

**Incluye:**
- 6 categorías de servicios
- ~58 servicios con precios y duraciones
- Promos especiales (Yape/Plin, Promo Aurora, días específicos)
- Packs combinados

**Categorías:**
1. **Extensiones de Pestañas** (12 servicios): Clásicas, Rimel, Mojado, retoques, promos
2. **Lifting** (7 servicios): Lifting, Tinturado, Diseño cejas, promos
3. **Cejas y Rostro** (8 servicios): Depilación, diseño, laminado, rostro, bozo
4. **Uñas** (18 servicios): Manicure, Rubber, Polly/Soft Gel, pedicure, diseño, Retiro, packs, Promo Aurora
5. **Microblading** (4 servicios): Cejas, Shading, Microlips, Hidra Lips
6. **Depilación** (9 servicios): Axilas, bikini, piernas, packs

**Ejecutar:**
```bash
psql -U zmlash -d zm_lash_nails -f scripts/db/seed-services.sql
# O desde la raíz:
npm run db:seed
```

### `seed-employees.sql`
Configura las chicas del salón con sus roles y comisiones.

**Incluye:**
- 4 chicas con colores distintivos
- Esquema de comisiones configurado
- Roles (owner/employee)

**Chicas:**
- **Vanessa** (Dueña) - 🟡 Oro (#D4AF37)
  - 100% cuando trabaja
  - 40% de trabajos de las chicas
  - Cubre insumos, arriendo, arbitrios

- **Sthefani** - 🟣 Púrpura (#9B59B6)
  - 60% chica / 40% casa

- **Romina** - 💗 Rosa (#E91E63)
  - 60% chica / 40% casa

- **Yosaida** - 🔵 Cyan (#00BCD4)
  - 60% chica / 40% casa

**Ejecutar:**
```bash
psql -U zmlash -d zm_lash_nails -f scripts/db/seed-employees.sql
# O desde la raíz:
npm run db:seed
```

## 🚀 Orden de Ejecución

Para inicializar una base de datos nueva:

```bash
# 1. Crear schema (Drizzle)
npm run db:push

# 2. Poblar servicios y chicas
npm run db:seed
```

O manualmente con psql:
```bash
psql -U zmlash -d zm_lash_nails -f scripts/db/seed-services.sql
psql -U zmlash -d zm_lash_nails -f scripts/db/seed-employees.sql
```

## 🔄 Re-ejecutar Scripts

Ambos scripts incluyen `DELETE` al inicio, por lo que son seguros para re-ejecutar:
- **seed-services.sql**: Limpia y recrea servicios
- **seed-employees.sql**: Limpia y recrea chicas

⚠️ **Advertencia**: Re-ejecutar borrará datos existentes en esas tablas.

## 📊 Verificación

Cada script incluye consultas de verificación al final que muestran:
- Total de registros insertados
- Resumen por categoría
- Esquemas de comisión

## 🔧 Troubleshooting

### Error: "database does not exist"
```bash
# Crear la base de datos primero
createdb -U zmlash zm_lash_nails
```

### Error: "permission denied"
```bash
# Asegurarse de tener los permisos correctos
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE zm_lash_nails TO zmlash;"
```

### Error: "relation does not exist"
```bash
# Ejecutar primero las migraciones de Drizzle
npm run db:push
```

## 📝 Notas

- Todos los IDs son UUIDs generados por PostgreSQL
- Los precios están en Soles (S/)
- Las duraciones están en minutos
- Los colores están en formato hexadecimal (#RRGGBB)
- En la UI y mensajes se usa "chicas" para el personal (tabla employees)

## 🔗 Ver También

- [Schema de base de datos](../../packages/shared-schema/src/schema.ts)
- [Configuración Drizzle](../../drizzle.config.ts)
- [Documentación completa](../../docs/replit.md)
