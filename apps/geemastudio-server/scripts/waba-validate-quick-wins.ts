#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json

import {
  detectAITrigger,
  parseAIResponse,
} from "../supabase/functions/whatsapp-webhook/handlers/ai-assistant.ts";
import {
  looksLikeServiceBrowseIntent,
  matchesCartCorrectionIntent,
  stickyDayIfBookable,
} from "../supabase/functions/whatsapp-webhook/handlers/booking-flow.ts";
import {
  parseClientIdentity,
  parseClientIdentityFromTexts,
  parseClientIdentityStitchingFragments,
} from "../supabase/functions/whatsapp-webhook/handlers/client-identity.ts";
import { matchesReclamacionesIntent } from "../supabase/functions/whatsapp-webhook/lib/reclamaciones-handoff.ts";
import {
  matchesCancelCitaIntent,
  matchesTimeCorrectionIntent,
} from "../supabase/functions/whatsapp-webhook/handlers/pending-appointment.ts";
import { matchesRefundIntent } from "../supabase/functions/whatsapp-webhook/lib/staff-escalation.ts";
import {
  buildFixedDepositInstructionsFromConfig,
  DEFAULT_DEPOSIT_FIXED_INSTRUCTIONS,
} from "../supabase/functions/whatsapp-webhook/handlers/payment.ts";
import { getPoliticasCitaWhatsApp } from "../supabase/functions/whatsapp-webhook/lib/policies.ts";

const lists = {
  recommendation: [],
  free_question: [],
  blocked: [],
};

const cases: Array<{ name: string; ok: boolean; detail: string }> = [
  {
    name: "Identidad normal",
    ok:
      parseClientIdentity("María Quilca Prado DNI 43181785")?.name ===
      "MARÍA QUILCA PRADO",
    detail: "conserva nombre y DNI",
  },
  {
    name: "Plantilla reenviada no contamina nombre",
    ok:
      parseClientIdentity(
        "Nombre y Apellidos: Melisa Quilca Prado | Celular: 51999999999 | DNI/CE 43181785 | Servicio: Baby Volumen 3D | Fecha: viernes 21 de agosto | Hora: 11:30 AM",
      ) === null,
    detail: "rechaza texto de reserva como nombre",
  },
  {
    name: "Boleta copy + CE (Edgar)",
    ok:
      parseClientIdentity(
        "Edgar Nieves Aguilar\n933 282 122\nCE: 004184803\nLunes 21 de septiembre a las 11",
        { senderPhone: "51933282122" },
      )?.dni === "004184803" &&
      parseClientIdentity(
        "Edgar Nieves Aguilar\n933 282 122\nCE: 004184803\nLunes 21 de septiembre a las 11",
        { senderPhone: "51933282122" },
      )?.name === "EDGAR NIEVES AGUILAR",
    detail: "acepta nombre+celular+CE+fecha del copy de boleta",
  },
  {
    name: "Boleta partida se junta",
    ok:
      parseClientIdentityFromTexts(
        ["Edgar Nieves Aguilar\n933 282 122", "CE: 004184803"],
        { senderPhone: "51933282122" },
      )?.name === "EDGAR NIEVES AGUILAR",
    detail: "concatena inbound de boleta",
  },
  {
    name: "Boleta partida ignora el chat de alrededor",
    ok: (() => {
      const thread = [
        "Ok",
        "08722704",
        "Mirta Aguayo , 998168754",
        "Las clásicas están 70",
        "Temprano",
        "Clásicas en pestañas y uñas las escogería allá",
      ];
      const noisy = parseClientIdentityFromTexts(thread, {
        senderPhone: "51998168754",
      });
      const stitched = parseClientIdentityStitchingFragments(thread, {
        senderPhone: "51998168754",
      });
      return (
        noisy === null &&
        stitched?.dni === "08722704" &&
        stitched.name === "MIRTA AGUAYO"
      );
    })(),
    detail: "DNI suelto + nombre no se contaminan con el resto del hilo",
  },
  {
    name: "sacar cita no es corrección de carrito",
    ok:
      !matchesCartCorrectionIntent(
        "estoy checando mi agenda para ver qué día puedo sacar cita",
      ) &&
      matchesCartCorrectionIntent("quiero sacar el lifting") &&
      matchesCartCorrectionIntent("sacar las uñas"),
    detail: "Dubraska cae a Haiku; quitar un servicio sigue en carrito",
  },
  {
    name: "Día viejo de sesión no reabre el calendario",
    ok:
      stickyDayIfBookable("2026-08-21", {
        fromMessage: false,
        todayKey: "2026-09-27",
      }) === null &&
      stickyDayIfBookable("2026-08-21", {
        fromMessage: true,
        todayKey: "2026-09-27",
      }) === "2026-08-21" &&
      stickyDayIfBookable("2026-09-28", {
        fromMessage: false,
        todayKey: "2026-09-27",
      }) === "2026-09-28",
    detail: "Agendar de retoque ignora el 21 de agosto guardado",
  },
  {
    name: "Libro de reclamaciones: pide el libro o un reclamo formal",
    ok:
      matchesReclamacionesIntent("¿Dónde está el libro de reclamaciones?") &&
      matchesReclamacionesIntent("Quiero poner un reclamo") &&
      matchesReclamacionesIntent("quisiera presentar una queja") &&
      matchesReclamacionesIntent("voy a denunciar esto en Indecopi") &&
      matchesReclamacionesIntent("Tengo un reclamo del servicio"),
    detail: "enlace + pausa + push",
  },
  {
    name: "Libro de reclamaciones: no dispara con garantía ni charla normal",
    ok:
      !matchesReclamacionesIntent("quiero reclamar la garantía") &&
      !matchesReclamacionesIntent("se me cayeron las pestañas") &&
      !matchesReclamacionesIntent("quiero agendar una cita para mañana") &&
      !matchesReclamacionesIntent("¿cuánto cuesta el lifting?") &&
      !matchesReclamacionesIntent(""),
    detail: "garantía sigue su gate",
  },
  {
    name: "Devolución: cancelar/pedir plata de vuelta escala (Luciana …6431)",
    ok:
      matchesRefundIntent(
        "hola quisiera cancelar mi reserva, me podría hacer devolución del dinero?",
      ) &&
      matchesRefundIntent("quiero que me devuelvan mi adelanto") &&
      matchesRefundIntent(
        "ya no puedo ir, ¿me regresan el reembolso del yape?",
      ) &&
      matchesRefundIntent(
        "necesito cancelar y que me reintegren mis 25 soles, mi pago",
      ) &&
      matchesRefundIntent("quiero la devolución del dinero") &&
      matchesRefundIntent("devuélvanme el dinero"),
    detail: "respaldo determinístico: pausa + push",
  },
  {
    name: "Devolución: pregunta informativa previa al pago NO escala",
    ok:
      !matchesRefundIntent("¿el adelanto se devuelve?") &&
      !matchesRefundIntent("¿el adelanto de S/25 se devuelve?") &&
      !matchesRefundIntent("si cancelo, ¿se devuelve el adelanto?") &&
      !matchesRefundIntent("¿se puede devolver el adelanto?") &&
      !matchesRefundIntent("quiero agendar mañana a las 10") &&
      !matchesRefundIntent("quiero cancelar mi cita") &&
      !matchesRefundIntent(""),
    detail: "cancelar sin plata sigue el menú Mi cita; citar S/25 no escala",
  },
  {
    name: "Cancelar: frases con 'reserva' y 'quisiera'",
    ok:
      matchesCancelCitaIntent("hola quisiera cancelar mi reserva") &&
      matchesCancelCitaIntent("Me gustaría cancelar la reserva") &&
      matchesCancelCitaIntent("quiero anular mi reserva") &&
      !matchesCancelCitaIntent("quiero agendar una reserva"),
    detail: "antes caían a Haiku sin escalar",
  },
  {
    name: "Haiku escalate_staff se parsea con motivo",
    ok:
      parseAIResponse(
        "<text>Entiendo 💜</text>\n<action>escalate_staff:refund</action>",
      ).action?.type === "escalate_staff" &&
      parseAIResponse("<text>x</text>\n<action>escalate_staff</action>").action
        ?.param === "money",
    detail: "acción nueva reconocida por el parser",
  },
  {
    name: "Corrección de hora en pasado",
    ok: matchesTimeCorrectionIntent("Hola recuerda q era 9:30 am"),
    detail: "reconoce «era 9:30 am»",
  },
  {
    name: "Fallback de diseño",
    ok: looksLikeServiceBrowseIntent("Me gusta el diseño ojo abierto"),
    detail: "muestra catálogo si Haiku falla",
  },
  {
    name: "Opt-out no pasa a Haiku",
    ok: detectAITrigger("STOP", lists)?.type === "opt_out",
    detail: "clasifica STOP determinísticamente",
  },
  {
    name: "Resumen fijo cierra en agradecimiento",
    ok: !DEFAULT_DEPOSIT_FIXED_INSTRUCTIONS.includes("Si te equivocaste"),
    detail: "el fallback no incluye la instrucción de cancelar",
  },
  {
    name: "CMS antiguo no reintroduce cancelar",
    ok: !buildFixedDepositInstructionsFromConfig(
      new Map([
        [
          "deposit_fixed_instructions_text",
          {
            text: `${DEFAULT_DEPOSIT_FIXED_INSTRUCTIONS}\n\n_Si te equivocaste o quieres cambiar algo, escribe_ *Cancelar* _para volver a empezar._`,
          },
        ],
      ]),
      25,
    ).includes("Si te equivocaste"),
    detail: "limpia el sufijo antiguo antes de enviar",
  },
  {
    name: "Políticas sin no-show ni porcentaje",
    ok: (() => {
      const text = getPoliticasCitaWhatsApp().toLowerCase();
      return (
        !text.includes("no-show") &&
        !text.includes("adelanto (20%)") &&
        text.includes("una sola vez")
      );
    })(),
    detail: "usa inasistencia, una reprogramación y adelanto genérico",
  },
];

const routeCases = [
  {
    message: "¿abren mañana?",
    hasCart: false,
    expected: "no booking_request",
    knownIssue: false,
  },
  {
    message: "¿cuál es su horario de mañana?",
    hasCart: false,
    expected: "no booking_request",
    knownIssue: false,
  },
  {
    message: "disponible mañana para lifting",
    hasCart: true,
    expected: "determinista por carrito",
    knownIssue: false,
  },
  {
    message: "quiero una cita para mañana",
    hasCart: false,
    expected: "booking_request",
    knownIssue: false,
  },
  {
    message: "pasado mañana tienen espacio",
    hasCart: false,
    expected: "booking_request",
    knownIssue: false,
  },
] as const;

let failures = 0;
for (const testCase of cases) {
  console.log(
    `${testCase.ok ? "✅" : "❌"} ${testCase.name}: ${testCase.detail}`,
  );
  if (!testCase.ok) failures++;
}

console.log("\nRutas de solicitud para mañana:");
for (const testCase of routeCases) {
  const trigger = detectAITrigger(testCase.message, lists, testCase.hasCart);
  const route = trigger?.type ?? "determinista";
  const ok =
    testCase.expected === "booking_request"
      ? route === "booking_request"
      : route !== "booking_request";
  const marker = ok ? "✅" : testCase.knownIssue ? "⚠️" : "❌";
  console.log(
    `${marker} "${testCase.message}" → ${route}; esperado: ${testCase.expected}`,
  );
  if (!ok && !testCase.knownIssue) failures++;
}

const totalChecks = cases.length + routeCases.length;
console.log(`\n${totalChecks - failures}/${totalChecks} casos OK`);
if (failures > 0) Deno.exit(1);
