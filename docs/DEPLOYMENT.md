# 🚀 Guía de Deployment

Guía completa para desplegar ZM Lash & Nails Beauty en producción.

## 📋 Requisitos Previos

- Node.js 20+
- PostgreSQL 16
- Cuenta en Vercel (para frontend web)
- Cuenta en Railway/Render/Fly.io (para backend)
- Token permanente de WhatsApp Business API

## 🌐 Deployment Frontend (Vercel)

### 1. Preparar el Proyecto

```bash
# Build del frontend web (Next.js en apps/web)
npm run web:build

# El output está en apps/web/.next
```

La carpeta `web-build/` en raíz ya no se usa; la landing es Next.js (apps/web). Si en el futuro generas el build web de la app móvil con `expo export:web` desde apps/mobile, el output irá a `apps/mobile/dist/` (ignorado en .gitignore).

### 2. Configurar Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 3. Variables de Entorno en Vercel

En el dashboard de Vercel, configurar:

```
EXPO_PUBLIC_API_URL=https://tu-api.railway.app
```

### 4. Configuración Automática

El archivo `vercel.json` ya está configurado con:
- `rootDirectory: apps/web` (Next.js)
- Build con `npm run build` en apps/web
- Headers de seguridad

## 🔧 Deployment Backend (Railway)

### 1. Preparar Base de Datos

```bash
# Conectar a PostgreSQL en Railway
psql postgresql://user:pass@host:5432/dbname

# Aplicar schema
npm run db:push

# Poblar datos
psql postgresql://... -f scripts/db/seed-services.sql
psql postgresql://... -f scripts/db/seed-employees.sql
```

### 2. Variables de Entorno

Configurar en Railway:

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PORT=5000
NODE_ENV=production

# WhatsApp Business API
WHATSAPP_VERIFY_TOKEN=tu_token_verificacion
WHATSAPP_ACCESS_TOKEN=tu_token_permanente
WHATSAPP_PHONE_NUMBER_ID=955827900949233
WHATSAPP_BUSINESS_ACCOUNT_ID=874286482261151
```

### 3. Deploy con Railway CLI

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### 4. Configurar Webhook de WhatsApp

Una vez deployado el backend, actualizar en Meta:

```
URL: https://tu-backend.railway.app/webhook/whatsapp
Token: tu_token_verificacion
```

## 🐳 Deployment con Docker (Opcional)

### Dockerfile Backend

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server ./server
COPY shared ./shared
COPY scripts ./scripts
RUN npm run server:build
EXPOSE 5000
CMD ["npm", "run", "server:prod"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: zm_lash_nails
      POSTGRES_USER: zmlash
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: .
    environment:
      DATABASE_URL: postgresql://zmlash:${DB_PASSWORD}@db:5432/zm_lash_nails
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      - db

volumes:
  pgdata:
```

## 📱 Deployment Móvil (EAS Build)

### iOS

```bash
# Configurar EAS
npm install -g eas-cli
eas login

# Build para iOS
eas build --platform ios --profile production

# Submit a App Store
eas submit --platform ios
```

### Android

```bash
# Build para Android
eas build --platform android --profile production

# Submit a Play Store
eas submit --platform android
```

## 🔒 Seguridad Post-Deployment

### 1. Configurar CORS

En `server/index.ts`, ya está configurado para:
- Localhost en desarrollo
- Dominios de Replit/Vercel en producción

### 2. HTTPS

- **Vercel**: HTTPS automático
- **Railway**: HTTPS automático
- **Custom domain**: Configurar SSL certificate

### 3. Variables Sensibles

⚠️ **NUNCA** commitear:
- `.env` con tokens reales
- Credenciales de base de datos
- Tokens de WhatsApp

Usar variables de entorno en las plataformas.

## 📊 Monitoreo

### Logs Backend

```bash
# Railway
railway logs

# Vercel Functions
vercel logs
```

### Health Check Endpoint

Agregar en `server/routes.ts`:

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## 🔄 Actualizaciones

### Frontend

```bash
npm run web:build
vercel --prod
```

### Backend

```bash
git push
# Railway despliega automáticamente
```

### Base de Datos

```bash
# Migrar schema
npm run db:push

# Actualizar datos
psql postgresql://... -f scripts/db/nuevo-script.sql
```

## 🆘 Troubleshooting

### Error: "Cannot connect to database"

```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Probar conexión
psql $DATABASE_URL -c "SELECT 1"
```

### Error: "WhatsApp webhook not working"

1. Verificar que el backend esté accesible públicamente
2. Revisar logs: `railway logs`
3. Verificar token de verificación en Meta
4. Comprobar que HTTPS esté habilitado

### Error: "Web build fails"

```bash
# Limpiar cache (Next.js en apps/web)
rm -rf apps/web/.next node_modules
npm install
npm run web:build
```

## 📚 Referencias

- [Expo Web Deployment](https://docs.expo.dev/distribution/publishing-websites/)
- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)

## ✅ Checklist Pre-Deployment

- [ ] Tests pasando
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] Webhook de WhatsApp configurado
- [ ] Dominios DNS configurados
- [ ] SSL/HTTPS habilitado
- [ ] Monitoreo configurado
- [ ] Backups de base de datos configurados

---

**Última actualización**: 2026-02-01
