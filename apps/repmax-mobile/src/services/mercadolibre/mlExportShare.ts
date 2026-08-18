// Compartir CSV exportado — requiere expo-file-system + expo-sharing en el APK nativo.
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

export async function compartirCsvExport(
  contenido: string,
  nombreBase = 'repmax-ml'
): Promise<void> {
  const nombre = `${nombreBase}-${new Date().toISOString().slice(0, 10)}.csv`
  const path = `${FileSystem.cacheDirectory ?? ''}${nombre}`

  await FileSystem.writeAsStringAsync(path, contenido, {
    encoding: FileSystem.EncodingType.UTF8,
  })

  const puedeCompartir = await Sharing.isAvailableAsync()
  if (!puedeCompartir) {
    throw new Error(
      'Este dispositivo no permite compartir archivos. Copia el CSV desde otro canal.'
    )
  }

  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'Exportar catálogo ML',
    UTI: 'public.csv',
  })
}
