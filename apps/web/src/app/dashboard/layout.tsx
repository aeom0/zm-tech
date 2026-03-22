import type { Metadata } from "next";
import { FinanzasAuthWrapper } from "../finanzas/FinanzasAuthWrapper";

export const metadata: Metadata = {
  title: "Dashboard | SalonPro",
  description: "Métricas y KPIs de tu negocio.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FinanzasAuthWrapper>{children}</FinanzasAuthWrapper>;
}
