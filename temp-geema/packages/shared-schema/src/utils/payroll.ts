export type PaymentMode = "commission" | "salary" | "mixed";

export interface PayrollInput {
  paymentAmount: number;
  paymentMode: PaymentMode;
  commissionPercentage: number | null;
  salaryAmount: number | null;
}

export interface PayrollResult {
  employeeEarns: number;
  salonEarns: number;
  mode: PaymentMode;
  label: string; // Texto descriptivo para UI
}

export function calculateEmployeeEarnings(input: PayrollInput): PayrollResult {
  const { paymentAmount, paymentMode, commissionPercentage, salaryAmount } =
    input;

  switch (paymentMode) {
    case "commission": {
      const pct = commissionPercentage ?? 0;
      const employeeEarns = paymentAmount * (pct / 100);
      return {
        employeeEarns,
        salonEarns: paymentAmount - employeeEarns,
        mode: "commission",
        label: `${pct}% comisión`,
      };
    }
    case "salary":
      return {
        employeeEarns: 0,
        salonEarns: paymentAmount,
        mode: "salary",
        label: "Salario fijo",
      };
    case "mixed": {
      const pct = commissionPercentage ?? 0;
      const employeeEarns = paymentAmount * (pct / 100);
      return {
        employeeEarns,
        salonEarns: paymentAmount - employeeEarns,
        mode: "mixed",
        label:
          salaryAmount != null
            ? `${salaryAmount} + ${pct}%`
            : `${pct}% + salario`,
      };
    }
  }
}
