// ============================================================
// RepMAX Business Suite — Pantalla de Carrito
// ============================================================
import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CartPanel } from '../../components/pos/CartPanel';
import type { POSStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<POSStackParamList, 'Cart'>;

export default function CartScreen({ navigation }: Props) {
  return (
    <CartPanel
      onCheckout={() => navigation.navigate('Payment')}
      onBrowseProducts={() => navigation.goBack()}
    />
  );
}
