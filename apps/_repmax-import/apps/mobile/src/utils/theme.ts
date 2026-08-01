// ============================================================
// RepMAX Business Suite — Design System "Industrial Dark"
// ============================================================

export const colors = {
  bg: {
    primary:   '#0D0D0D',  // Negro carbón
    secondary: '#1A1A1A',  // Cards y superficies
    elevated:  '#242424',  // Modales, dropdowns
    border:    '#2E2E2E',  // Separadores
  },
  text: {
    primary:   '#F5F5F5',  // Texto principal
    secondary: '#9E9E9E',  // Texto de apoyo
    disabled:  '#555555',  // Deshabilitado
    inverse:   '#0D0D0D',  // Sobre fondos naranjas
  },
  brand: {
    orange:      '#FF6B00',  // Naranja eléctrico — acción principal
    orangeLight: '#FF8C3A',  // States hover/pressed
    steel:       '#607D8B',  // Gris acero
    steelLight:  '#90A4AE',  // Gris acero claro
  },
  semantic: {
    success: '#4CAF50',
    warning: '#FFC107',
    error:   '#F44336',
    info:    '#2196F3',
  },
  status: {
    inStock:    '#4CAF50',  // Verde
    lowStock:   '#FFC107',  // Amarillo: stock bajo
    outOfStock: '#F44336',  // Rojo: sin stock
    new:        '#2196F3',  // Azul: repuesto nuevo
    used:       '#FF6B00',  // Naranja: Sección Chivera
  },
};

export const typography = {
  fontFamily: {
    regular:  'Inter_400Regular',
    medium:   'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold:     'Inter_700Bold',
  },
  size: {
    xs:    10,
    sm:    12,
    base:  14,
    md:    16,
    lg:    18,
    xl:    20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  xs:    4,
  sm:    8,
  md:    12,
  base:  16,
  lg:    20,
  xl:    24,
  '2xl': 32,
  '3xl': 48,
};

export const borderRadius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
};
