export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
        <td key={i} className="px-6 py-4">
          <div className="h-4 rounded-lg bg-[#e8e2d4] animate-pulse w-3/4" />
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
    <div className="space-y-4 rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 p-8 animate-pulse shadow-sm">
      <div className="h-5 w-1/3 rounded-lg bg-[#e8e2d4]" />
      <div className="h-4 w-2/3 rounded-lg bg-[#e8e2d4]" />
      <div className="h-4 w-1/2 rounded-lg bg-[#e8e2d4]" />
    </div>
  );
}
