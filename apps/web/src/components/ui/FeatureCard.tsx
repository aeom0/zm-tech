import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: string;
  title: string;
  description: string;
  index: number;
};

export function FeatureCard({ icon, title, description, index }: Props) {
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[icon];

  return (
    <div
      className="group p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary flex items-center justify-center mb-4 transition-colors duration-300 text-primary group-hover:text-white">
        {IconComponent && <IconComponent size={24} strokeWidth={1.75} />}
      </div>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
