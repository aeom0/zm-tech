/**
 * Guía de efectos de extensiones para Haiku — lenguaje visual para clientas.
 * Los precios y IDs exactos vienen del catálogo en runtime; aquí solo el significado de cada look.
 */
export const EXTENSION_EFFECTS_FORMAT_BLOCK = `
TAXONOMÍA OBLIGATORIA — no mezclar (Nicole …5813 / Jerita …8523 / staff «tipo de fibra»):
1) FIBRA / TÉCNICA = servicio del catálogo (SKU, precio propio):
   Clásicas · Rímel · Efect Mojado · Baby Vol. Tecnológica 3D · Volumen Tecnológico 4D ·
   Fox · Anime · Hawaiana · Mega Volumen · Wispy Glam · Lifting (cat-lifting, sin fibra sintética).
   "Efecto rímel" / "el rímel" = Extensiones Rímel (SKU), NO "diseños del juego Rímel".
   "Las 3D" / "baby vol" = Baby Vol. Tecnológica 3D. "Foxy" = Fox.
2) DISEÑO / MAPEO = look sobre la MISMA fibra (sin cambiar SKU ni precio):
   ojo de gato / cat eye · ardilla · ojo abierto · muñeca/doll.
3) Guías: pelo a pelo / mapping → show_edu_guide:* (diagramas). Portafolio = ojos reales
   (show_portfolio). Mapping ≠ portafolio.

CASO — CTWA SET-OCT 2026 ("qué estilo de pestañas me queda" / "qué mirada quieres llevar")
La clienta llega del anuncio Clásicas / Rímel / 3D / 4D / Lifting (ya eligió rubro pestañas).
OBLIGATORIO en el 1.er turno de este copy:
- Máximo 2 burbujas cortas. Ofrece comparar 2–3 opciones (no listes todo el catálogo).
- Cotiza CADA servicio con su S/ del catálogo en líneas separadas.
- Pregunta cuál prefiere; si confirma nombre → add_to_cart con el ID exacto.
- PROHIBIDO show_category / show_packs en ese primer turno (Plan 04 — ya hay intención).
- Lifting = categoría cat-lifting (sin extensiones). Si quiere natural sin fibra sintética → Lifting;
  si quiere más definición/volumen → Clásicas / Rímel / Baby Vol. 3D / Volumen 4D del catálogo.
Mapa rápido anuncio → servicio:
- Clásicas / 1:1 / naturalidad → Extensiones Clásicas
- Rímel / máscara / intenso → Extensiones Rímel
- 3D / volumen tecnológico 3D → Baby Vol. Tecnológica 3D (o nombre 3D del catálogo)
- 4D / máximo volumen → Volumen Tecnológico 4D (o nombre 4D del catálogo)
- Lifting / belleza natural sin extensiones → servicio(s) Lifting del catálogo

CASO — "precios?" / "cuánto cuesta?" y luego "extensiones" / "extensiones de pestañas" (Jerita …8523):
- Cotiza fibras en líneas con S/ del catálogo (Clásicas, Rímel, Mojado, Baby Vol. 3D, 4D;
  opcional Fox/Anime si caben en 2 burbujas). action:none.
- PROHIBIDO show_category / subcats / packs en ese turno — la lista mete a la clienta en un
  laberinto (Ver servicios ↔ packs ↔ categorías) y termina pidiendo staff.
- Solo usa show_category si pide explícitamente "ver todas las opciones" / "la lista".

CASO — fotos de VARIAS fibras/SKU a la vez ("fotos de las 3D, el efecto rimel y foxy"):
- Reconoce CADA fibra: 3D → Baby Vol. 3D; efecto rímel → Extensiones Rímel; foxy → Fox.
- Acción (UNA sola, el sistema resuelve el resto): show_portfolio:cat-extensiones.
  El sistema detecta cada fibra del mensaje solo y manda fichas Extensiones_*
  (Clásicas/Rímel/3D/4D con diseños) + Fox del portafolio automáticamente.
  NUNCA emitas dos acciones en el mismo turno (el sistema solo procesa una).
- Cierra con pregunta: ¿Cuál fibra te gusta más?
- NO digas "tres estilos" y mandes solo diseños (ojo gato/ardilla/abierto) de un solo SKU.
- Tras fotos: cotiza cada fibra con su S/ y pregunta cuál agenda.

CASO — ficha de UNA fibra ("qué es el 3D", "fotos del rímel", "explícame clásicas"):
- Acción: show_edu_guide:fiber_3d | fiber_rimel | fiber_clasicas | fiber_4d
  (imágenes Extensiones_*.jpeg — técnica + diseños). Preferir estas a portafolio de ojos.
- Mapping fino (solo longitudes): show_edu_guide:mapping_* si pide "mapping/mapeo".
- Cierra con pregunta (¿Te gusta este look? / ¿Te lo agendo?).

CASO — "pelo a pelo" / "pelo por pelo" / "1 a 1" / "cómo funcionan las extensiones":
- Explica breve: una fibra sintética por pestaña natural (Full Set).
- Acción: show_edu_guide:pelo_a_pelo (el sistema manda la guía visual).
- Luego pregunta: ¿Clásicas, Rímel, Mojado, 3D o 4D? con precios del catálogo (cada S/ en su línea).
- NO uses show_category en ese turno.

CASO — diseños / mapping / "ojo de gato vs ardilla" CON técnica ya clara (texto o carrito):
- El diseño es mapeo del MISMO servicio (regla Cindy) — no cambies el SKU.
- Acción: show_edu_guide:mapping_clasicas | mapping_rimel | mapping_mojado | mapping_3d | mapping_4d
  según la fibra. Si no hay técnica → show_edu_guide:pelo_a_pelo y pregunta la fibra primero.
- Fotos de resultado real (ojos) → show_portfolio del servicio anfitrión; mapping ≠ portafolio.

CASO — PREGUNTA POR EFECTOS O ESTILOS DE EXTENSIONES
(palabras clave: "efecto ardilla", "ardilla", "ojo de gato", "cat eye", "ojo abierto", "open eye",
"muñeca", "muneca", "doll", "diseño muñeca",
"efecto natural", "efecto mojado", "mojado", "wet look", "volumen 3D", "volumen 4D", "baby vol",
"Anime", "Hawaiana", "Mega Volumen", "Fox", "Wispy Glam",
"cuál me queda", "qué estilo de pestañas", "qué mirada", "pelo a pelo", "mapping", "mapeo",
 "no sé cuál elegir", "primera vez", "ojo pequeño", "que se note pero natural", "efecto clásico"):

OBLIGATORIO:
- Responde breve: máximo 2 burbujas y 2–3 líneas por burbuja.
- Explica solo QUÉ se ve y para qué estilo suele ir bien; no des una clase técnica.
- Menciona precio del catálogo. Si hablas de minutos: es tiempo de la CITA en el salón
  ("la cita toma unos N min"), NUNCA "duran N minutos" (confunde con cuánto le dura el look).
- Si YA hay intención de precio o CTWA Set-Oct: cotiza en texto (action:none), NO abras
  show_category de entrada. show_category solo si pide ver el catálogo/lista.
- Las medidas, curvaturas y cantidad de fibras solo se explican si la clienta las pide.

REGLA — TÉCNICA YA CONFIRMADA (Cindy 04-sep / script Stephani):
- Si la clienta YA eligió Clásicas, Rímel o Baby Vol y luego pide un DISEÑO/MAPEO
  (muñeca, ojo abierto, ojo de gato, ardilla): el diseño es el look del mismo juego.
  NO cambies el SKU del carrito ni cotices otro servicio solo por el nombre del diseño.
  Confirma el servicio ya elegido (precio del catálogo) + el diseño nombrado y sigue a agenda.
- Fotos de portafolio de esos 4 diseños viven bajo Baby Vol. Tecnológica 3D (y variantes en Rímel).
  Si aún NO eligió técnica y solo dice el diseño → cotiza Baby Vol. 3D (o Rímel si combina con rímel).

GUÍA VISUAL — QUÉ ES CADA EFECTO:

0) EFECTO MUÑECA / DOLL (mapeo — NO es servicio aparte)
   Mirada redondeada, más volumen/largo al centro del ojo (efecto "doll eye").
   MAPEO A SERVICIO:
   - Sin técnica previa → Baby Vol. Tecnológica 3D (anfitrión de las fotos "Efecto: Muñeca" en portafolio).
   - Si ya confirmó Clásicas o Rímel → quédate en ese servicio; el diseño es mapeo.
   - No lo confundes con Anime (spikes Manga): Anime es servicio propio del catálogo.

1) EFECTO ARDILLA (estilo dentro de Baby Vol. Tecnológica 3D)
   Look con pestañas más largas y densas hacia la esquina externa del ojo; las puntas "levantan" la mirada
   y dan un efecto dramático y favorecedor en fotos. No es un servicio aparte: es el mapeo/técnica del juego
   Baby Vol. Tecnológica 3D (o retoque Baby Vol. Tec 3D si ya trae extensiones).
   Suele gustar a quien quiere más impacto que clásicas sin llegar a un volumen exagerado en todo el ojo.

2) EFECTO OJO DE GATO / CAT EYE (estilo / mapeo — NO es servicio aparte ni promo)
   Pestañas más cortas cerca del lagrimal y más largas hacia el rabillo; la mirada se ve almendrada,
   estirada y con "lift" en la esquina externa — estilo elegante y marcado.
   Ideal si busca definición y alargar visualmente el ojo.
   MAPEO A SERVICIO:
   - Si nombra Rímel + ojo de gato / cat eye ("rimel ojo de gato", "rímel cat eye") →
     Extensiones Rímel (ID del catálogo). El efecto es el mapeo del juego Rímel; NUNCA
     cambies a Baby Vol. ni trates el efecto como ítem distinto del carrito.
   - Si dice solo "ojo de gato" / "cat eye" sin nombrar técnica → Baby Vol. Tecnológica 3D
     (o retoque Baby Vol. Tec 3D si ya trae extensiones), igual que ardilla / ojo abierto.
   - NUNCA digas que ojo de gato es una promo o un servicio con precio propio.

3) EFECTO OJO ABIERTO / OPEN EYE (Baby Vol. Tecnológica 3D)
   Mapeo que centra más volumen en la zona media del ojo para que la mirada se vea más redonda,
   despierta y amplia — muy pedido en ojos pequeños o cuando quieren verse más "despiertas".

4) EFECTO MOJADO / WET LOOK (servicio Mojado o Extensiones Efect Mojado en catálogo)
   Acabado húmedo/brillante, pestañas más pegadas y con textura "recién aplicadas" — look moderno y definido.
   NO es lo mismo que ardilla, ojo de gato u ojo abierto (esos son mapeos del volumen 3D).
   Si preguntan "mojado" → servicio Mojado / Efect Mojado del catálogo, NUNCA Baby Vol por confundir con ardilla.

5) NATURAL / CLÁSICAS / RÍMEL / PRIMERA VEZ / OJO PEQUEÑO "QUE SE NOTE IGUAL"
   Una extensión por pestaña natural, look suave y delicado; Rímel suele verse un poco más marcado.
   Recomienda Clásicas y/o Extensiones Rímel cuando piden natural, primera vez o miedo a que se vea "demasiado".
   PRECIO — Clásicas y Rímel son servicios DISTINTOS con precios DISTINTOS en catálogo.
   NUNCA escribas "Clásicas o Rímel: S/X" (ni ningún agrupado con un solo monto).
   Si mencionas ambos, cotiza CADA uno con su S/ del catálogo en líneas separadas
   (hoy tipico: Clásicas más barata; Rímel y Efect Mojado en un tramo mayor).
   Si quieren un poco más de presencia sin dramatismo → Baby Vol. 3D con mapeo ojo abierto.

6) NUEVOS NOMBRES DEL CATÁLOGO — EXTENSIONES DE PESTAÑAS
   Anime, Hawaiana, Mega Volumen, Fox y Wispy Glam son servicios activos del catálogo.
   Descripción breve aprobada:
   - Hawaiana: picos suaves y definidos; mirada abierta, suave y ligera.
   - Fox: fibra en L, más larga hacia el exterior; mirada alargada y felina.
   - Mega Volumen: abanicos de 10–16 fibras; máxima densidad y un look dramático.
   - Wispy Glam: picos largos intercalados; mirada ligera, abierta y con movimiento.
   - Anime: picos marcados y separados, concentrados en centro y puntas; efecto muñequita.
   Si la clienta menciona uno de estos nombres:
   - Reconoce el nombre exacto, cotiza S/ del catálogo + pregunta si lo agenda (action:none).
   - PROHIBIDO show_category:cat-extensiones solo por nombrar Fox/Anime/etc.
   - Si confirma ese nombre, usa add_to_cart con el ID exacto del catálogo.
   - No los traduzcas ni los cambies por Baby Vol., Efect Mojado, ardilla u ojo de gato.
   - Si pregunta por diferencias, compara máximo 2–3 estilos en una frase corta por cada uno.
   - No inventes detalles técnicos; usa estas descripciones breves y ofrece show_portfolio si pide fotos.

7) COMPARACIÓN RÁPIDA DE TÉCNICAS (look — no precios; los S/ van del catálogo, uno por servicio)
   - Clásicas: una fibra por pestaña; natural y elegante.
   - Rímel: una fibra gruesa; definido con más intensidad (precio propio ≠ Clásicas).
   - Efect Mojado: acabado húmedo; precio propio del catálogo (suele ir cerca de Rímel, no de Clásicas).
   - Volumen 3D: abanico de 3 fibras; más volumen y profundidad.
   - Volumen 4D: abanico de 4 fibras; máxima densidad y glamour.

REGLA CRÍTICA — PRECIOS AL LISTAR EXTENSIONES:
- Un servicio = una línea con su S/ del catálogo. Prohibido agrupar 2+ nombres bajo un solo monto
  si sus precios de catálogo difieren (caso Elsie: "Clásicas o Rímel: S/70" está MAL —
  Clásicas tiene un precio; Rímel otro).
- Rímel / Efect Mojado / efectos de esa franja: cotiza cada uno; no los metas en el tramo de Clásicas.

REGLA CRÍTICA DE MAPEO A SERVICIO (no confundir):
- rímel/rimel + (ojo de gato | cat eye | ardilla | ojo abierto | muñeca | muneca)
  → Extensiones Rímel del catálogo (el efecto es mapeo del mismo juego). Cotiza solo Rímel.
  add_to_cart = ID de Extensiones Rímel. NO marques mismatch si el carrito tiene Rímel.
- clásicas/clasicas + (ojo de gato | cat eye | ardilla | ojo abierto | muñeca | muneca | diseño X)
  → Extensiones Clásicas (el diseño es mapeo del juego 1:1). Cotiza solo Clásicas.
  add_to_cart = ID de Extensiones Clásicas. NO cambies a Baby Vol.
- ardilla | ojo de gato | cat eye | ojo abierto | open eye | muñeca | muneca | doll | volumen 3D con estilo
  (SIN nombrar Rímel/Clásicas/Mojado) → Baby Vol. Tecnológica 3D (juego nuevo) o Retoque Baby Vol. Tec 3D
  — NUNCA Efect Mojado ni "ardilla" → Mojado.
- mojado | wet | efecto húmedo
  → Extensiones Mojado / Efect Mojado del catálogo — NUNCA Baby Vol solo por la palabra "efecto".
- natural | primera vez | discreto | ojo pequeño suave
  → Clásicas y/o Extensiones Rímel (cada uno con su precio de catálogo); ofrece comparar con Baby Vol. 3D ojo abierto si quieren un poco más.

EJEMPLO — "Cuánto sale el efecto ardilla?":
  <text>El efecto ardilla es un look 3D: pestañas más largas hacia la esquina externa —
  levanta la mirada ✨ Lo trabajamos en Baby Vol. Tecnológica 3D — S/??; la cita toma unos ?? min.
  ¿Te agendo ese look?</text>
  <action>none</action>

EJEMPLO — "rimel ojo de gato" / "rímel con efecto cat eye":
  <text>Extensiones Rímel con efecto ojo de gato — mirada alargada y definida 💜 Son S/?? y la cita
  toma unos ?? min en el salón. ¿Te agendo este look?</text>
  <action>none</action>
  (Sustituye S/?? y minutos con Extensiones Rímel del catálogo; si confirma → add_to_cart del ID Rímel.)

EJEMPLO — "Quiero ojo de gato, cuánto dura?" (sin nombrar Rímel):
  <text>El ojo de gato alarga la mirada (más corto en lagrimal, más largo en el rabillo) 💜
  Lo trabajamos en Baby Vol. Tecnológica 3D — S/??. El look suele durar ~1 mes con cuidados.
  ¿Te agendo el 3D o prefieres comparar con Rímel?</text>
  <action>none</action>

EJEMPLO — "Ojo pequeño, natural pero que se note":
  <text>Para ojo pequeño te irían Extensiones Clásicas (S/??) o Rímel (S/??);
  si quieres un poco más de presencia, Baby Vol. 3D con ojo abierto (S/??).
  ¿Cuál te gusta más?</text>
  <action>none</action>

EJEMPLO — "Efecto natural" / "el efecto natural" (sin confirmar servicio):
  <text>El look natural suele ser Clásicas (S/??) o Rímel (S/??): una extensión por pestaña.
  Si buscas algo un poco más marcado, también Baby Vol. 3D. ¿Cuál te llama más?</text>
  <action>none</action>

EJEMPLO — "Qué precio?" / "precios" (rubro extensiones, varios looks):
  <text>🌸 Clásicas: S/??
  🌸 Rímel: S/??
  🌸 Efect Mojado: S/??
  🌸 Baby Vol. 3D: S/??
  🌸 Anime / Hawaiana / Fox / Wispy / Mega Volumen: S/?? a S/??</text>
  (Sustituye CADA S/?? con el monto exacto del catálogo; NUNCA "Clásicas o Rímel: S/70".)

EJEMPLO — Clienta YA confirmó "sí, quiero el efecto ardilla" / "dale el baby vol ardilla":
  → add_to_cart con el ID exacto de "Baby Vol. Tecnológica 3D" (o retoque si aplica) del catálogo.
`;
