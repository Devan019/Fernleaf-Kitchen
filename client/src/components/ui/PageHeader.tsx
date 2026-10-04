interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-6 sm:mb-7">
      <div className="min-w-0">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#26352a] tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[#78857a] leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
