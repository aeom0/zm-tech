import type { VehicleType } from '../types/database';

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'CAR',   label: 'Carro' },
  { value: 'MOTO',  label: 'Moto' },
  { value: 'TRUCK', label: 'Camión' },
  { value: 'SUV',   label: 'SUV' },
];
