import type { Employee } from "./schema";
import type { PaymentMode } from "./utils/payroll";

export type EmployeeRow = Employee & {
  paymentMode: PaymentMode;
  salaryAmount: string | null;
};

