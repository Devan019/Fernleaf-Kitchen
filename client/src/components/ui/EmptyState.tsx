interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d9d2c2] bg-[#f5f1e6] text-[#78857a] shadow-inner">
          {icon}
        </div>
      )}
      <p className="font-serif text-lg font-semibold text-[#26352a]">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-[#78857a] max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
