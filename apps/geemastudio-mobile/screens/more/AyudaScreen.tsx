import React, { useState } from 'react'
import { ScrollView, StyleSheet, View, Pressable, Alert } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { MenuRow } from '@/components/MenuRow'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { useAppInfo } from '@/screens/settings/hooks/useAppInfo'
import { Spacing, BorderRadius } from '@/constants/theme'

type FaqItem = {
  id: string
  question: string
  answer: string
}

function buildFaqs(staffLabel: string, staffSingular: string): FaqItem[] {
  return [
    {
      id: 'finanzas',
      question: '¿Dónde están las finanzas?',
      answer:
        'En Más → Finanzas encuentras ingresos, pagos y comisiones. Desde Inicio también hay un acceso rápido si eres admin.',
    },
    {
      id: 'cita',
      question: '¿Cómo creo o edito una cita?',
      answer: `Ve a Agenda y toca el botón +. Puedes buscar cliente y servicio, elegir fecha/hora y asignar ${staffSingular}. Para editar, toca la cita en el calendario.`,
    },
    {
      id: 'feriados',
      question: '¿Cómo configuro feriados o días cerrados?',
      answer:
        'En Más → Mi negocio → Feriados y no laborables. Puedes recargar los nacionales de tu país, marcar un día como cerrado o dejar horario reducido.',
    },
    {
      id: 'logo',
      question: '¿Cómo cambio el logo o los colores?',
      answer:
        'En Más → Mi negocio → Datos del negocio puedes subir el logo y ajustar los colores de marca. El logo aparece en el encabezado de Inicio, Agenda, Servicios y Clientes.',
    },
    {
      id: 'personal',
      question: `¿Dónde gestiono el ${staffLabel.toLowerCase()}?`,
      answer: `En Más → Equipo. Ahí puedes ver el listado, agregar o editar a cada ${staffSingular}, y asignar turnos.`,
    },
    {
      id: 'inventario',
      question: '¿Cómo veo el inventario y stock bajo?',
      answer:
        'En Más → Mi negocio → Inventario. Si un ítem baja del mínimo, Inicio muestra un aviso para que lo repongas a tiempo.',
    },
  ]
}

export default function AyudaScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { config } = useTenant()
  const { appVersion } = useAppInfo()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const faqs = buildFaqs(config.terminology.staff, config.terminology.staffSingular)

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing['3xl'],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>
        Preguntas frecuentes
      </ThemedText>

      {faqs.map((faq) => {
        const open = expandedId === faq.id
        return (
          <Pressable
            key={faq.id}
            onPress={() => setExpandedId(open ? null : faq.id)}
            style={[
              styles.faqRow,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
          >
            <View style={styles.faqHeader}>
              <ThemedText style={[styles.faqQuestion, { color: theme.text }]}>
                {faq.question}
              </ThemedText>
              <Feather
                name={open ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.textMuted}
              />
            </View>
            {open ? (
              <ThemedText style={[styles.faqAnswer, { color: theme.textSecondary }]}>
                {faq.answer}
              </ThemedText>
            ) : null}
          </Pressable>
        )
      })}

      <ThemedText
        style={[styles.sectionLabel, { color: theme.textMuted, marginTop: Spacing.xl }]}
      >
        Soporte
      </ThemedText>

      <MenuRow
        icon="message-circle"
        label="Contactar soporte"
        onPress={() =>
          Alert.alert('Próximamente', 'El contacto directo con soporte estará disponible pronto.')
        }
      />
      <MenuRow
        icon="info"
        label="Versión de la app"
        onPress={() => {}}
        rightElement={
          <ThemedText type="small" style={{ opacity: 0.6 }}>
            {appVersion}
          </ThemedText>
        }
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  faqRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  faqAnswer: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
  },
})
