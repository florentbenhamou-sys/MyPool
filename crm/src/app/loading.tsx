export default function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="bg-muted h-32 animate-pulse rounded-lg" />
      <div className="bg-muted h-32 animate-pulse rounded-lg" />
    </div>
  );
}
