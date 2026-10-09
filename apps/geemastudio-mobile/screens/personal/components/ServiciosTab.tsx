import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useTheme } from '@/hooks/useTheme'
import { useServicesData } from '@/screens/services/hooks/useServicesData'

import { useEmployeeServices, useSaveEmployeeServices } from '../hooks/useAvailability'
import { AvailabilityNote } from './AvailabilityNote'
import { av } from './availabilityStyles'

export function ServiciosTab({
  employeeId,
  staffSingular,
}: {
  employeeId: string
  staffSingular: string
}) {
  const { theme } = useTheme()
  const { services, categories, isLoading: catalogLoading } = useServicesData()
  const current = useEmployeeServices(employeeId)
  const save = useSaveEmployeeServices(employeeId)

  const [doesAll, setDoesAll] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)

  useResetOnChange([current.data], () => {
    if (!current.data) return
    setDoesAll(current.data.doesAll)
    setSelected(new Set(current.data.serviceIds))
  })

  const grouped = useMemo(() => {
    const active = services.filter((s) => s.is_active)
    return categories
      .map((category) => ({ category, items: active.filter((s) => s.category_id === category.id) }))
      .filter((g) => g.items.length > 0)
  }, [categories, services])

  const toggle = (id: string) => {
    setSaved(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategory = (ids: string[]) => {
    setSaved(false)
    setSelected((prev) => {
      const next = new Set(prev)
      const all = ids.every((id) => next.has(id))
      ids.forEach((id) => (all ? next.delete(id) : next.add(id)))
      return next
    })
  }

  if (catalogLoading || current.isLoading) {
    return <ActivityIndicator style={{ marginTop: 32 }} color={theme.primary} />
  }
  if (current.isError || !current.data) {
    return (
      <AvailabilityNote kind="error">
        No se pudieron cargar los servicios. Recarga antes de guardar, para no borrar la lista.
      </AvailabilityNote>
    )
  }

  const missingSelection = !doesAll && selected.size === 0

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={av.content}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            av.card,
            av.row,
            { borderColor: theme.border, backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={av.grow}>
            <ThemedText style={av.title}>Hace todos los servicios</ThemedText>
            <ThemedText type="small" style={{ color: theme.textMuted }}>
              Incluye los servicios nuevos que agregues después.
            </ThemedText>
          </View>
          <Switch
            value={doesAll}
            onValueChange={(v) => {
              setDoesAll(v)
              setSaved(false)
            }}
            trackColor={{ false: theme.border, true: `${theme.primary}88` }}
            thumbColor={doesAll ? theme.primary : theme.textMuted}
          />
        </View>

        {!doesAll &&
          grouped.map(({ category, items }) => {
            const ids = items.map((s) => s.id)
            const count = ids.filter((id) => selected.has(id)).length
            return (
              <View
                key={category.id}
                style={[
                  av.card,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundDefault,
                    padding: 0,
                    gap: 0,
                  },
                ]}
              >
                <Pressable
                  onPress={() => toggleCategory(ids)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: count === ids.length }}
                  style={[
                    av.row,
                    {
                      padding: 12,
                      minHeight: 48,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <Feather
                    name={
                      count === ids.length ? 'check-square' : count > 0 ? 'minus-square' : 'square'
                    }
                    size={22}
                    color={count > 0 ? theme.primary : theme.textMuted}
                  />
                  <ThemedText style={[av.title, av.grow]}>{category.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {count}/{ids.length}
                  </ThemedText>
                </Pressable>
                {items.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => toggle(s.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected.has(s.id) }}
                    style={[av.row, { paddingHorizontal: 12, paddingVertical: 8, minHeight: 44 }]}
                  >
                    <Feather
                      name={selected.has(s.id) ? 'check-square' : 'square'}
                      size={22}
                      color={selected.has(s.id) ? theme.primary : theme.textMuted}
                    />
                    <ThemedText style={av.grow}>{s.name}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textMuted }}>
                      {s.duration} min
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )
          })}

        {!doesAll && grouped.length === 0 && (
          <AvailabilityNote kind="info">Aún no hay servicios activos.</AvailabilityNote>
        )}
        {missingSelection && (
          <AvailabilityNote kind="warning">
            {`Sin servicios marcados, ${staffSingular.toLowerCase()} no recibirá citas.`}
          </AvailabilityNote>
        )}
        {save.error && (
          <AvailabilityNote kind="error">{(save.error as Error).message}</AvailabilityNote>
        )}
      </ScrollView>
      <View style={av.footer}>
        <Pressable
          style={[
            av.primaryBtn,
            { backgroundColor: theme.primary, opacity: save.isPending ? 0.6 : 1 },
          ]}
          disabled={save.isPending || !current.isSuccess}
          onPress={() =>
            save.mutate(
              { doesAll, serviceIds: Array.from(selected) },
              { onSuccess: () => setSaved(true) }
            )
          }
        >
          {save.isPending ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <Feather name={saved ? 'check' : 'save'} size={18} color={theme.buttonText} />
          )}
          <ThemedText style={{ color: theme.buttonText, fontWeight: '600' }}>
            {saved ? 'Guardado' : 'Guardar servicios'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  )
}
