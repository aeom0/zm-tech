/** Carril asignado a una cita dentro de su cluster de solapamiento + total de carriles del cluster. */
export interface OverlapLaneInfo {
  lane: number
  laneCount: number
}

/**
 * Asigna "carriles" (lanes) a citas que se solapan en el tiempo dentro de una
 * misma columna (ej. mismo profesional en la vista día del owner, con citas
 * posicionadas de forma absoluta por hora de inicio/duración).
 *
 * Sin esto, dos citas del mismo profesional en el mismo rango horario se
 * dibujan una encima de otra (texto ilegible). Con carriles, cada cita
 * solapada ocupa un ancho parcial de la columna, lado a lado.
 *
 * Algoritmo: barrido por inicio agrupando en clusters de citas mutuamente
 * solapadas (se extiende el fin del cluster mientras la siguiente cita
 * empiece antes de que termine el cluster acumulado). Dentro de cada
 * cluster, asigna carriles en modo greedy: el primer carril libre cuyo fin
 * sea <= el inicio de la cita actual; si ninguno está libre, se abre un
 * carril nuevo.
 */
export function computeOverlapLayout(
  items: { id: string; startMin: number; endMin: number }[]
): Map<string, OverlapLaneInfo> {
  const result = new Map<string, OverlapLaneInfo>()
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  let cluster: typeof sorted = []
  let clusterEnd = -Infinity

  const flushCluster = () => {
    if (cluster.length === 0) return
    const laneEnds: number[] = []
    const laneById = new Map<string, number>()
    for (const it of cluster) {
      let laneIdx = laneEnds.findIndex((end) => end <= it.startMin)
      if (laneIdx === -1) {
        laneIdx = laneEnds.length
        laneEnds.push(it.endMin)
      } else {
        laneEnds[laneIdx] = it.endMin
      }
      laneById.set(it.id, laneIdx)
    }
    const laneCount = laneEnds.length
    for (const it of cluster) {
      result.set(it.id, { lane: laneById.get(it.id) ?? 0, laneCount })
    }
    cluster = []
    clusterEnd = -Infinity
  }

  for (const it of sorted) {
    if (cluster.length === 0 || it.startMin < clusterEnd) {
      cluster.push(it)
      clusterEnd = Math.max(clusterEnd, it.endMin)
    } else {
      flushCluster()
      cluster.push(it)
      clusterEnd = it.endMin
    }
  }
  flushCluster()

  return result
}
