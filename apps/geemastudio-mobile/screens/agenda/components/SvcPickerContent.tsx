import React, { useState } from 'react'
import { View, ScrollView, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Colors, Spacing } from '@/constants/theme'

import type {
  AgendaEmployee,
  AgendaPack,
  AgendaService,
  AgendaServiceCategory,
} from '../types'

const PACKS_TAB = '__packs__'

interface SvcPickerContentProps {
  categories: AgendaServiceCategory[]
  services: AgendaService[]
  employees: AgendaEmployee[]
  packs: AgendaPack[]
  currencySymbol: string
  staffSingular: string
  selectedCatId: string
  onSelectCat: (id: string) => void
  selectedEmployeeId: string
  onSelectEmployee: (id: string) => void
  selectedServiceIds: string[]
  onToggleService: (serviceId: string, employeeId: string) => void
  onAddPack: (pack: AgendaPack, employeeId: string) => void
  onClose: () => void
}

export function SvcPickerContent({
  categories,
  services,
  employees,
  packs,
  currencySymbol,
  staffSingular,
  selectedCatId,
  onSelectCat,
  selectedEmployeeId,
  onSelectEmployee,
  selectedServiceIds,
  onToggleService,
  onAddPack,
  onClose,
}: SvcPickerContentProps) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState(selectedCatId || categories[0]?.id || '')

  const isPacksTab = activeTab === PACKS_TAB
  const activePacks = packs.filter((p) => p.is_active)

  const handleSelectCat = (id: string) => {
    setActiveTab(id)
    onSelectCat(id)
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color={theme.textSecondary} />
        </Pressable>
        <ThemedText style={styles.title}>
          {isPacksTab ? 'Agregar pack' : 'Agregar servicio'}
        </ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollFadeRow
        backgroundColor={theme.backgroundDefault}
        arrowColor={theme.textSecondary}
        style={styles.catTabs}
        contentContainerStyle={styles.catTabsContent}
      >
        {categories.map((cat) => {
          const active = activeTab === cat.id
          return (
            <Pressable
              key={cat.id}
              style={[
                styles.catChip,
                { borderColor: active ? theme.primary : theme.border },
                active && { backgroundColor: theme.primary },
              ]}
              onPress={() => handleSelectCat(cat.id)}
            >
              <ThemedText
                style={[styles.catChipText, { color: active ? '#FFFFFF' : theme.text }]}
                numberOfLines={1}
              >
                {cat.name}
              </ThemedText>
            </Pressable>
          )
        })}
        {activePacks.length > 0 ? (
          <Pressable
            style={[
              styles.catChip,
              { borderColor: isPacksTab ? theme.primary : theme.border },
              isPacksTab && { backgroundColor: theme.primary },
            ]}
            onPress={() => setActiveTab(PACKS_TAB)}
          >
            <ThemedText
              style={[styles.catChipText, { color: isPacksTab ? '#FFFFFF' : theme.text }]}
            >
              Packs
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollFadeRow>

      <View style={[styles.empSection, { borderColor: theme.border }]}>
        <ThemedText style={[styles.empLabel, { color: theme.textMuted }]}>
          {staffSingular} que realiza:
        </ThemedText>
        <ScrollFadeRow
          backgroundColor={theme.backgroundDefault}
          arrowColor={theme.textSecondary}
          contentContainerStyle={styles.empScroll}
        >
          {employees.map((emp) => {
            const selected = selectedEmployeeId === emp.id
            return (
              <Pressable
                key={emp.id}
                style={[
                  styles.empChip,
                  {
                    borderColor: emp.color,
                    backgroundColor: selected ? emp.color : 'transparent',
                  },
                ]}
                onPress={() => onSelectEmployee(emp.id)}
              >
                <View
                  style={[
                    styles.empAvatar,
                    {
                      backgroundColor: selected ? 'rgba(255,255,255,0.3)' : emp.color + '25',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.empInitial,
                      { color: selected ? '#FFFFFF' : emp.color },
                    ]}
                  >
                    {emp.name[0]}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[styles.empName, { color: selected ? '#FFFFFF' : theme.text }]}
                >
                  {emp.name.split(' ')[0]}
                </ThemedText>
              </Pressable>
            )
          })}
        </ScrollFadeRow>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      >
        {isPacksTab ? (
          activePacks.length === 0 ? (
            <ThemedText style={[styles.empty, { color: theme.textMuted }]}>
              No hay packs disponibles
            </ThemedText>
          ) : (
            activePacks.map((pack) => {
              const alreadyAdded =
                pack.service_ids.length > 0 &&
                pack.service_ids.every((sid) => selectedServiceIds.includes(sid))
              return (
                <Pressable
                  key={pack.id}
                  style={[
                    styles.svcRow,
                    {
                      backgroundColor: alreadyAdded
                        ? theme.primary + '12'
                        : theme.backgroundSecondary,
                      borderColor: alreadyAdded ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => !alreadyAdded && onAddPack(pack, selectedEmployeeId)}
                >
                  <View style={styles.svcRowMain}>
                    <ThemedText
                      style={[
                        styles.svcName,
                        { color: alreadyAdded ? theme.primary : theme.text },
                      ]}
                      numberOfLines={2}
                    >
                      {pack.name}
                    </ThemedText>
                    <ThemedText style={[styles.svcDetail, { color: theme.textMuted }]}>
                      {pack.service_ids.length} servicios · {currencySymbol} {pack.price}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: alreadyAdded ? theme.primary : 'transparent',
                        borderColor: alreadyAdded ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    {alreadyAdded ? (
                      <Feather name="check" size={12} color="#FFFFFF" />
                    ) : null}
                  </View>
                </Pressable>
              )
            })
          )
        ) : services.filter((s) => s.category_id === activeTab).length === 0 ? (
          <ThemedText style={[styles.empty, { color: theme.textMuted }]}>
            No hay servicios en esta categoría
          </ThemedText>
        ) : (
          services
            .filter((s) => s.category_id === activeTab)
            .map((service) => {
              const isSelected = selectedServiceIds.includes(service.id)
              return (
                <Pressable
                  key={service.id}
                  style={[
                    styles.svcRow,
                    {
                      backgroundColor: isSelected
                        ? theme.primary + '12'
                        : theme.backgroundSecondary,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => onToggleService(service.id, selectedEmployeeId)}
                >
                  <View style={styles.svcRowMain}>
                    <ThemedText
                      style={[
                        styles.svcName,
                        { color: isSelected ? theme.primary : theme.text },
                      ]}
                      numberOfLines={2}
                    >
                      {service.name}
                    </ThemedText>
                    <ThemedText style={[styles.svcDetail, { color: theme.textMuted }]}>
                      {service.duration} min · {currencySymbol} {service.price}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? theme.primary : 'transparent',
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    {isSelected ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
              )
            })
        )}
      </ScrollView>

      <Pressable
        style={[styles.doneBtn, { backgroundColor: theme.primary }]}
        onPress={onClose}
      >
        <Feather name="check" size={18} color="#FFFFFF" />
        <ThemedText style={styles.doneBtnText}>
          Listo ({selectedServiceIds.length} servicio
          {selectedServiceIds.length !== 1 ? 's' : ''})
        </ThemedText>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  catTabs: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  catTabsContent: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    height: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
  },
  empLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  empScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  empChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  empAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empInitial: { fontSize: 13, fontWeight: '700' },
  empName: { fontSize: 13, fontWeight: '600' },
  list: { flex: 1 },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  empty: {
    textAlign: 'center',
    paddingTop: Spacing['3xl'],
  },
  svcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  svcRowMain: { flex: 1 },
  svcName: { fontSize: 14, fontWeight: '500' },
  svcDetail: { fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  doneBtn: {
    height: 52,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    margin: Spacing.lg,
  },
  doneBtnText: {
    color: Colors.light.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
})
