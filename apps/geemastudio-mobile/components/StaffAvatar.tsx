import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'

interface StaffAvatarProps {
  name: string | null
  avatarUrl: string | null
  /** Color de la profesional (borde e inicial). */
  color: string
  size?: number
  /** Si se pasa, reemplaza el borde de color (p. ej. selección). */
  ringColor?: string
}

/** Foto de la profesional o su inicial, con el anillo de su color de agenda. */
export function StaffAvatar({ name, avatarUrl, color, size = 48, ringColor }: StaffAvatarProps) {
  const { theme } = useTheme()
  const url = avatarUrl?.trim()
  const initial = (name?.trim().split(/\s+/)[0] ?? '?').slice(0, 1).toUpperCase()
  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringColor ? 3 : 2,
          borderColor: ringColor ?? color,
          backgroundColor: theme.backgroundSecondary,
        },
      ]}
    >
      {url ? (
        <Image source={{ uri: url }} style={styles.img} contentFit="cover" transition={120} />
      ) : (
        <ThemedText
          style={{ color, fontSize: size * 0.4, lineHeight: size * 0.5, fontWeight: '700' }}
        >
          {initial}
        </ThemedText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  ring: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%' },
})
