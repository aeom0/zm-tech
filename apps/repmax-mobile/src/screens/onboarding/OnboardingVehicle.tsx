// ============================================================
// RepMAX Business Suite — Selección de tipo de vehículo (paso 2)
// Pantalla clave: tres cards grandes con protagonismo visual
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { VEHICLE_OPTIONS } from '../../constants/onboarding';
import OnboardingProgressBar from '../../components/onboarding/OnboardingProgressBar';
import SelectionCard from '../../components/onboarding/SelectionCard';
import { Screen } from '../../components/layout/Screen';
import { colors, typography, spacing } from '../../utils/theme';
import type { VehicleType } from '../../types/onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingVehicle'>;

export default function OnboardingVehicle({ navigation }: Props) {
  const { state, setVehicleType } = useOnboarding();

  const seleccionarVehiculo = (tipo: VehicleType) => {
    setVehicleType(tipo);
    navigation.navigate('OnboardingBusiness');
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      {/* Barra de progreso: paso 2 de 5 */}
      <OnboardingProgressBar currentStep={2} totalSteps={5} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titulo}>¿Con qué trabajas?</Text>
        <Text style={styles.subtitulo}>
          Tu selección personaliza todo el sistema
        </Text>

        {/* Tres cards grandes — protagonismo visual */}
        <View style={styles.cards}>
          {VEHICLE_OPTIONS.map(opcion => (
            <SelectionCard
              key={opcion.value}
              iconName={opcion.iconName}
              title={opcion.label}
              description={opcion.description}
              selected={state.vehicleType === opcion.value}
              onPress={() => seleccionarVehiculo(opcion.value)}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
  titulo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  subtitulo: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  cards: {
    gap: spacing.md,
    flex: 1,
  },
});
