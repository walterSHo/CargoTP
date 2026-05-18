export function InfoHint({ label, explanation }: { label: string; explanation: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      <span
        aria-label={explanation}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-line bg-[rgba(78,161,255,0.12)] text-[10px] font-bold text-[var(--accent)]"
        title={explanation}
      >
        i
      </span>
    </span>
  );
}
