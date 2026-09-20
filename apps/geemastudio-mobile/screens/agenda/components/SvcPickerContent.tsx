import React, { useMemo, useState } from 'react'
import { View, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Colors, Spacing } from '@/constants/theme'

import type { AgendaEmployee, AgendaPack, AgendaService, AgendaServiceCategory } from '../types'
import type { Promo, PromotionItem } from '../../services/types'

const PACKS_TAB = '__packs__'
const PROMOS_TAB = '__promos__'

interface SvcPickerContentProps {
  categories: AgendaServiceCategory[]
  services: AgendaService[]
  employees: AgendaEmployee[]
  packs: AgendaPack[]
  promotions: Promo[]
  promotionItems: PromotionItem[]
  currencySymbol: string
  staffSingular: string
  selectedCatId: string
  onSelectCat: (id: string) => void
  selectedEmployeeId: string
  onSelectEmployee: (id: string) => void
  selectedServiceIds: string[]
  selectedPromoIds: string[]
  onToggleService: (serviceId: string, employeeId: string) => void
  onAddPack: (pack: AgendaPack, employeeId: string) => void
  onAddPromo: (promo: Promo, employeeId: string) => void
  onClose: () => void
}

export function SvcPickerContent({
  categories,
  services,
  employees,
  packs,
  promotions,
  promotionItems: _promotionItems,
  currencySymbol,
  staffSingular,
  selectedCatId,
  onSelectCat,
  selectedEmployeeId,
  onSelectEmployee,
  selectedServiceIds,
  selectedPromoIds,
  onToggleService,
  onAddPack,
  onAddPromo,
  onClose,
}: SvcPickerContentProps) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState(selectedCatId || categories[0]?.id || '')
  const [searchQuery, setSearchQuery] = useState('')

  const isPacksTab = activeTab === PACKS_TAB
  const isPromosTab = activeTab === PROMOS_TAB
  const activePacks = packs.filter((p) => p.is_active)
  const activePromos = promotions.filter((p) => p.is_active)

  const query = searchQuery.trim().toUpperCase()
  const filteredPacks = useMemo(
    () => (query ? activePacks.filter((p) => p.name.toUpperCase().includes(query)) : activePacks),
    [activePacks, query]
  )
  const filteredPromos = useMemo(
    () =>
      query ? activePromos.filter((p) => p.title.toUpperCase().includes(query)) : activePromos,
    [activePromos, query]
  )
  const filteredServices = useMemo(() => {
    const byCategory = services.filter((s) => s.category_id === activeTab)
    return query ? byCategory.filter((s) => s.name.toUpperCase().includes(query)) : byCategory
  }, [services, activeTab, query])

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
          {isPacksTab ? 'Agregar pack' : isPromosTab ? 'Agregar promo' : 'Agregar servicio'}
        </ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.searchWrap, { borderColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar..."
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Feather name="x" size={16} color={theme.textMuted} />
          </Pressable>
        ) : null}
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
                style={[styles.catChipText, { color: active ? Colors.light.buttonText : theme.text }]}
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
              style={[styles.catChipText, { color: isPacksTab ? Colors.light.buttonText : theme.text }]}
            >
              Packs
            </ThemedText>
          </Pressable>
        ) : null}
        {activePromos.length > 0 ? (
          <Pressable
            style={[
              styles.catChip,
              { borderColor: isPromosTab ? theme.primary : theme.border },
              isPromosTab && { backgroundColor: theme.primary },
            ]}
            onPress={() => setActiveTab(PROMOS_TAB)}
          >
            <ThemedText
              style={[styles.catChipText, { color: isPromosTab ? Colors.light.buttonText : theme.text }]}
            >
              Promos
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
                    style={[styles.empInitial, { color: selected ? Colors.light.buttonText : emp.color }]}
                  >
                    {emp.name[0]}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.empName, { color: selected ? Colors.light.buttonText : theme.text }]}>
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
        {isPromosTab ? (
          filteredPromos.length === 0 ? (
            <ThemedText style={[styles.empty, { color: theme.textMuted }]}>
              No hay promos disponibles
            </ThemedText>
          ) : (
            filteredPromos.map((promo) => {
              const alreadyAdded = selectedPromoIds.includes(promo.id)
              return (
                <Pressable
                  key={promo.id}
                  style={[
                    styles.svcRow,
                    {
                      backgroundColor: alreadyAdded
                        ? theme.primary + '12'
                        : theme.backgroundSecondary,
                      borderColor: alreadyAdded ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => !alreadyAdded && onAddPromo(promo, selectedEmployeeId)}
                >
                  <View style={styles.svcRowMain}>
                    <ThemedText
                      style={[styles.svcName, { color: alreadyAdded ? theme.primary : theme.text }]}
                      numberOfLines={2}
                    >
                      {promo.badge ? `${promo.badge} · ` : ''}
                      {promo.title}
                    </ThemedText>
                    {promo.promo_price ? (
                      <ThemedText style={[styles.svcDetail, { color: theme.textMuted }]}>
                        {currencySymbol} {promo.promo_price}
                      </ThemedText>
                    ) : null}
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
                    {alreadyAdded ? <Feather name="check" size={12} color={Colors.light.buttonText} /> : null}
                  </View>
                </Pressable>
              )
            })
          )
        ) : isPacksTab ? (
          filteredPacks.length === 0 ? (
            <ThemedText style={[styles.empty, { color: theme.textMuted }]}>
              No hay packs disponibles
            </ThemedText>
          ) : (
            filteredPacks.map((pack) => {
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
                      style={[styles.svcName, { color: alreadyAdded ? theme.primary : theme.text }]}
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
                    {alreadyAdded ? <Feather name="check" size={12} color={Colors.light.buttonText} /> : null}
                  </View>
                </Pressable>
              )
            })
          )
        ) : filteredServices.length === 0 ? (
          <ThemedText style={[styles.empty, { color: theme.textMuted }]}>
            No hay servicios en esta categoría
          </ThemedText>
        ) : (
          filteredServices.map((service) => {
            const isSelected = selectedServiceIds.includes(service.id)
            return (
              <Pressable
                key={service.id}
                style={[
                  styles.svcRow,
                  {
                    backgroundColor: isSelected ? theme.primary + '12' : theme.backgroundSecondary,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => onToggleService(service.id, selectedEmployeeId)}
              >
                <View style={styles.svcRowMain}>
                  <ThemedText
                    style={[styles.svcName, { color: isSelected ? theme.primary : theme.text }]}
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
                  {isSelected ? <Feather name="check" size={12} color={Colors.light.buttonText} /> : null}
                </View>
              </Pressable>
            )
          })
        )}
      </ScrollView>

      <Pressable style={[styles.doneBtn, { backgroundColor: theme.primary }]} onPress={onClose}>
        <Feather name="check" size={18} color={Colors.light.buttonText} />
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
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
