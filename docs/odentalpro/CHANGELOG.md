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

### Cambiado
- Dependencias Expo actualizadas a versiones compatibles con SDK 56.

### Decisiones de arquitectura
- Apps dedicadas en vez de preset compartido con GeemaStudio (un solo vertical dental no necesita terminología dinámica).
- Supabase propio multi-tenant desde el día 0; reutiliza temporalmente el proyecto de ZM Tech landing (`llacowjutjfefboqgfnj`) hasta migrar a proyecto propio antes de producción.

Ver detalle en [03-PLAN-odentalpro-apps-dedicadas.md](03-PLAN-odentalpro-apps-dedicadas.md).
