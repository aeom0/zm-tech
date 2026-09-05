export type PaymentMode = 'commission' | 'salary' | 'mixed'

/** percent = % del generado; fixed_house = casa retiene monto fijo por línea */
export type CommissionMode = 'percent' | 'fixed_house'

export interface PayrollInput {
  paymentAmount: number
  paymentMode: PaymentMode
  commissionPercentage: number | null
  salaryAmount: number | null
  /** Solo aplica si paymentMode === 'commission' (o mixed). Default percent. */
  commissionMode?: CommissionMode | null
  houseCutFixed?: number | null
}

export interface PayrollResult {
  employeeEarns: number
  salonEarns: number
  mode: PaymentMode
  label: string // Texto descriptivo para UI
}

export function calculateEmployeeEarnings(input: PayrollInput): PayrollResult {
  const {
    paymentAmount,
    paymentMode,
    commissionPercentage,
    salaryAmount,
    commissionMode = 'percent',
    houseCutFixed = null,
  } = input

  switch (paymentMode) {
    case 'commission': {
      if (commissionMode === 'fixed_house') {
        const house = Math.min(Math.max(houseCutFixed ?? 0, 0), paymentAmount)
        const employeeEarns = paymentAmount - house
        return {
          employeeEarns,
          salonEarns: house,
          mode: 'commission',
          label: `Casa ${houseCutFixed ?? 0} fijo`,
        }
      }
      const pct = commissionPercentage ?? 0
      const employeeEarns = paymentAmount * (pct / 100)
      return {
        employeeEarns,
        salonEarns: paymentAmount - employeeEarns,
        mode: 'commission',
        label: `${pct}% comisión`,
      }
    }
    case 'salary':
      return {
        employeeEarns: 0,
        salonEarns: paymentAmount,
        mode: 'salary',
        label: 'Salario fijo',
      }
    case 'mixed': {
      if (commissionMode === 'fixed_house') {
        const house = Math.min(Math.max(houseCutFixed ?? 0, 0), paymentAmount)
        const employeeEarns = paymentAmount - house
        return {
          employeeEarns,
          salonEarns: house,
          mode: 'mixed',
          label:
            salaryAmount != null
              ? `${salaryAmount} + casa ${houseCutFixed ?? 0}`
              : `Casa ${houseCutFixed ?? 0} fijo`,
        }
      }
      const pct = commissionPercentage ?? 0
      const employeeEarns = paymentAmount * (pct / 100)
      return {
        employeeEarns,
        salonEarns: paymentAmount - employeeEarns,
        mode: 'mixed',
        label: salaryAmount != null ? `${salaryAmount} + ${pct}%` : `${pct}% + salario`,
      }
    }
  }
}
