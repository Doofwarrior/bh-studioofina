
export function ProgressTrack({ value, label }: { value: number; label: string }) {
  return (
    <span className="qah-progress-track" role="progressbar" aria-label={label}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <span style={{ width: `${value}%` }} />
    </span>
  );
}
