export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-slate-200 animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      <div className="h-4 w-2/3 rounded bg-slate-200" />
      <div className="h-4 w-1/2 rounded bg-slate-200" />
    </div>
  );
}
