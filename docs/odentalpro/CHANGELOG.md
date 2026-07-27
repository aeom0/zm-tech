# Changelog — OdentalPro

Todos los cambios notables se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

### Añadido
- Scaffold de apps dedicadas: `odentalpro-web`, `odentalpro-mobile`, `odentalpro-server` y `packages/@odentalpro/dental-schema` (Fase 0).
- Sistema visual "Sterile Aqua" y base de producto.
- Rediseño del odontograma según referencia clínica Dentalink.
- Diseño dividido en 6 archivos `.pen` por flujo (auth, agenda, pacientes, componentes, tokens, ux-states).
- Navegación (`RootNavigator`, `LoginScreen`) + módulo `screens/patients/` (lista y ficha de paciente) en `odentalpro-mobile`.
- Persistencia del odontograma en `odental_clinical_records.odontogram` vía `useClinicalRecords`, con modo solo-lectura/editable en la ficha del paciente (Fase 2 completa).

### Cambiado
- Dependencias Expo actualizadas a versiones compatibles con SDK 56.
- `eslint.config.js` (Expo flat config) en `geemastudio-mobile` y `odentalpro-mobile`.

### Arreglado
- `pnpm --filter odentalpro-mobile lint` fallaba con `ERR_PACKAGE_PATH_NOT_EXPORTED` en `zod-validation-error` (dependencia de `eslint-plugin-react-hooks@7.1.1`, que requiere el subpath `./v4` inexistente en la v3.5.4 resuelta en el workspace). Fix a nivel monorepo: override `zod-validation-error: ^4.0.0` en `pnpm-workspace.yaml` (nadie importa ese paquete directamente en el código fuente).
- Doble insert en `odental_clinical_records` si el usuario guardaba el odontograma dos veces antes del refetch — `PatientDetailScreen` mantiene `activeRecordId` local tras el primer guardado.
- Validación explícita de tenant/paciente en `useClinicalRecords.saveOdontogram` antes de insert/update.

### Decisiones de arquitectura
- Apps dedicadas en vez de preset compartido con GeemaStudio (un solo vertical dental no necesita terminología dinámica).
- Supabase propio multi-tenant desde el día 0; reutiliza temporalmente el proyecto de ZM Tech landing (`llacowjutjfefboqgfnj`) hasta migrar a proyecto propio antes de producción.

Ver detalle en [03-PLAN-odentalpro-apps-dedicadas.md](03-PLAN-odentalpro-apps-dedicadas.md).
