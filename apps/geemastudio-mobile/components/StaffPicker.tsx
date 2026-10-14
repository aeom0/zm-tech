import { Pressable, StyleSheet } from 'react-native'

import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { StaffAvatar } from '@/components/StaffAvatar'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing } from '@/constants/theme'

export interface StaffPickerItem {
  id: string
  name: string
  color: string
  avatar_url: string | null
}

interface StaffPickerProps {
  staff: StaffPickerItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Fila horizontal de avatares para elegir una profesional (selección única). */
export function StaffPicker({ staff, selectedId, onSelect }: StaffPickerProps) {
  const { theme } = useTheme()
  return (
    <ScrollFadeRow
      backgroundColor={theme.backgroundRoot}
      arrowColor={theme.textSecondary}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {staff.map((s) => {
        const active = s.id === selectedId
        return (
          <Pressable
            key={s.id}
            onPress={() => onSelect(s.id)}
            accessibilityRole="button"
            accessibilityLabel={s.name}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
          >
            <StaffAvatar
              name={s.name}
              avatarUrl={s.avatar_url}
              color={s.color}
              size={52}
              ringColor={active ? theme.primary : undefined}
            />
            <ThemedText
              numberOfLines={1}
              style={[
                styles.name,
                { color: active ? theme.primary : theme.textSecondary },
                active && styles.nameActive,
              ]}
            >
              {s.name.trim().split(/\s+/)[0]}
            </ThemedText>
          </Pressable>
        )
      })}
    </ScrollFadeRow>
  )
}

const styles = StyleSheet.create({
  row: { flexGrow: 0, flexShrink: 0 },
  content: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  item: { width: 68, alignItems: 'center', gap: 4 },
  name: { fontSize: 12, textAlign: 'center', maxWidth: '100%' },
  nameActive: { fontWeight: '700' },
})
