// ============================================================
// RepMAX Business Suite — Selección de tipo de negocio (paso 3)
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { BUSINESS_OPTIONS } from '../../constants/onboarding';
import OnboardingProgressBar from '../../components/onboarding/OnboardingProgressBar';
import SelectionCard from '../../components/onboarding/SelectionCard';
import { colors, typography, spacing } from '../../utils/theme';
import type { BusinessType } from '../../types/onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingBusiness'>;

export default function OnboardingBusiness({ navigation }: Props) {
  const { state, setBusinessType } = useOnboarding();

  const seleccionarNegocio = (tipo: BusinessType) => {
    setBusinessType(tipo);
    navigation.navigate('OnboardingTheme');
  };

  return (
    <View style={styles.contenedor}>
      {/* Barra de progreso: paso 3 de 5 */}
      <OnboardingProgressBar currentStep={3} totalSteps={5} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titulo}>¿Qué tipo de negocio tienes?</Text>

        <View style={styles.cards}>
          {BUSINESS_OPTIONS.map(opcion => (
            <SelectionCard
              key={opcion.value}
              iconName={opcion.iconName}
              title={opcion.label}
              description={opcion.description}
              selected={state.businessType === opcion.value}
              onPress={() => seleccionarNegocio(opcion.value)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
  titulo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.text.primary,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  cards: {
    gap: spacing.md,
    flex: 1,
  },
});
