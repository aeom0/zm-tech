// ============================================================
// RepMAX Business Suite — Detalle de Cliente
// ============================================================
import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CustomerDetailPanel } from '../../components/customers/CustomerDetailPanel';
import type { CustomersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CustomersStackParamList, 'CustomerDetail'>;

export default function CustomerDetailScreen({ route }: Props) {
  return <CustomerDetailPanel customerId={route.params.customerId} />;
}
