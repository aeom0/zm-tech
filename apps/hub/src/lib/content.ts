/** Strings del shell — nada hardcodeado en JSX. */

export const brand = {
  name: "ZM Tech",
  product: "Hub",
  tagline: "Torre de control de la fábrica",
} as const;

export const authCopy = {
  loginTitle: "Hub ZM Tech",
  loginSubtitle: "Panel interno — solo equipo",
  emailLabel: "Correo",
  emailPlaceholder: "tu@correo.com",
  passwordLabel: "Contraseña",
  passwordPlaceholder: "••••••••",
  submit: "Entrar",
  submitting: "Entrando…",
  errorGeneric: "No se pudo iniciar sesión",
  noAccessTitle: "Sin acceso",
  noAccessBody:
    "Tu cuenta está autenticada, pero no figura en hub_members. Pedí que te agreguen como miembro o aplicá el schema (plan 02).",
  noAccessLogout: "Salir",
  schemaMissingHint:
    "Si recién arrancás el Hub, las tablas hub_* aún no están en Supabase.",
} as const;

export const shellCopy = {
  panelLabel: "Panel",
  logout: "Salir",
  openMenu: "Abrir menú",
  closeMenu: "Cerrar menú",
  comingSoon: "Próximamente",
  dashboardEmptyTitle: "Dashboard",
  dashboardEmptyBody:
    "Resumen operativo de ZM Tech — clientes, proyectos y leads en tiempo real.",
  cargando: "Cargando…",
  errorGenerico: "Error al cargar datos",
  sinDatos: "Sin datos",
  confirmarEliminar: "¿Confirmar eliminación?",
  guardar: "Guardar",
  guardando: "Guardando…",
  cancelar: "Cancelar",
  editar: "Editar",
  eliminar: "Eliminar",
  nuevo: "Nuevo",
  volver: "Volver",
  verDetalle: "Ver detalle",
} as const;

export const dashboardCopy = {
  clientesActivos: "Clientes activos",
  proyectosEnDesarrollo: "En desarrollo",
  proyectosEnProduccion: "En producción",
  leadsSinConvertir: "Leads sin convertir",
  soporteActivo: "Con soporte activo",
  totalClientes: "Clientes",
  totalProyectos: "Proyectos",
  resumenTitulo: "Resumen",
} as const;

export const clientesCopy = {
  titulo: "Clientes",
  subtitulo: "Clientes activos, leads y proyectos",
  nuevo: "Nuevo cliente",
  sinClientes: "No hay clientes registrados",
  filtroEstado: "Estado",
  filtroVertical: "Vertical",
  todos: "Todos",
  nombreLabel: "Nombre / empresa",
  contactoLabel: "Contacto",
  emailLabel: "Correo",
  telefonoLabel: "Teléfono",
  whatsappLabel: "WhatsApp",
  paisLabel: "País",
  ciudadLabel: "Ciudad",
  verticalLabel: "Vertical",
  estadoLabel: "Estado",
  origenLabel: "Origen",
  notasLabel: "Notas",
  fichaProyectos: "Proyectos",
  fichaContratos: "Contratos",
  fichaOrigenRef: "Origen del lead",
  sinProyectos: "Sin proyectos asociados",
  sinContratos: "Sin contratos",
  nuevoContrato: "Nuevo contrato",
  guardadoOk: "Cliente guardado",
  errorGuardar: "Error al guardar cliente",
} as const;

export const proyectosCopy = {
  titulo: "Proyectos",
  subtitulo: "Todos los proyectos de la fábrica",
  nuevo: "Nuevo proyecto",
  sinProyectos: "No hay proyectos registrados",
  filtroEstado: "Estado",
  filtroTipo: "Tipo",
  filtroCliente: "Cliente",
  todos: "Todos",
  nombreLabel: "Nombre del proyecto",
  slugLabel: "Slug (identificador único)",
  tipoLabel: "Tipo",
  estadoLabel: "Estado",
  clienteLabel: "Cliente",
  sinCliente: "Producto propio (sin cliente)",
  repoLabel: "Repositorio",
  stackLabel: "Stack (separado por comas)",
  produccionUrlLabel: "URL producción",
  vercelLabel: "Proyecto Vercel",
  easLabel: "Proyecto EAS",
  supabaseRefLabel: "Supabase ref",
  versionLabel: "Versión",
  notasLabel: "Notas",
  guardadoOk: "Proyecto guardado",
  errorGuardar: "Error al guardar proyecto",
} as const;

export const contratoCopy = {
  titulo: "Contrato",
  montoLabel: "Monto USD",
  modeloPagoLabel: "Modelo de pago",
  soporteMensualLabel: "Soporte mensual USD",
  soporteActivoLabel: "Soporte activo",
  fechaInicioLabel: "Fecha inicio",
  fechaEntregaLabel: "Fecha entrega",
  notasLabel: "Notas",
  guardadoOk: "Contrato guardado",
  errorGuardar: "Error al guardar contrato",
  eliminarOk: "Contrato eliminado",
} as const;

export const leadsCopy = {
  titulo: "Leads",
  subtitulo: "Inbox del cotizador y landing",
  sinLeads: "No hay leads registrados",
  convertido: "Convertido",
  sinConvertir: "Sin convertir",
  convertirBtn: "Convertir a cliente",
  convirtiendo: "Convirtiendo…",
  convertidoOk: "Lead convertido a cliente",
  errorConvertir: "Error al convertir lead",
  origenCotizador: "Cotizador",
  origenLanding: "Landing",
  fechaLabel: "Fecha",
  servicioLabel: "Servicio",
  mensajeLabel: "Mensaje",
  presupuestoLabel: "Presupuesto",
  verCliente: "Ver cliente",
} as const;

export type NavItem = {
  href: string;
  label: string;
  /** Si true, el enlace se muestra deshabilitado (fases futuras). */
  disabled?: boolean;
  icon:
    | "dashboard"
    | "clientes"
    | "proyectos"
    | "leads"
    | "tickets"
    | "recordatorios"
    | "comunicaciones";
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/clientes", label: "Clientes", icon: "clientes" },
  { href: "/proyectos", label: "Proyectos", icon: "proyectos" },
  { href: "/leads", label: "Leads", icon: "leads" },
  { href: "/tickets", label: "Tickets", icon: "tickets", disabled: true },
  {
    href: "/recordatorios",
    label: "Recordatorios",
    icon: "recordatorios",
    disabled: true,
  },
  {
    href: "/comunicaciones",
    label: "Comunicaciones",
    icon: "comunicaciones",
    disabled: true,
  },
];

export const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clientes": "Clientes",
  "/proyectos": "Proyectos",
  "/leads": "Leads",
  "/tickets": "Tickets",
  "/recordatorios": "Recordatorios",
  "/comunicaciones": "Comunicaciones",
};
