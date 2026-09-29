import { clsx } from 'clsx';

type BadgeVariant = 'NOMINAL' | 'FLAGGED' | 'QUARANTINED' | 'OFFLINE' | 'IMPUTED' | 'SEVERE' | 'WARNING' | 'INFO' | 'RESOLVED' | 'ACTIVE' | 'DISPATCHED' | 'ISSUED' | 'N/A';

const BADGE_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  NOMINAL:     { bg: 'var(--color-healthy-bg)', text: 'var(--color-healthy-text)', border: 'var(--color-healthy-border)' },
  FLAGGED:     { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)', border: 'var(--color-warning-border)' },
  QUARANTINED: { bg: 'var(--color-fault-bg)', text: 'var(--color-fault-text)', border: 'var(--color-fault-border)' },
  OFFLINE:     { bg: 'var(--color-surface-alt)', text: 'var(--color-ink-muted)', border: 'var(--color-hairline)' },
  IMPUTED:     { bg: 'var(--color-telemetry-bg)', text: 'var(--color-telemetry-text)', border: 'var(--color-telemetry-border)' },
  SEVERE:      { bg: 'var(--color-fault-bg)', text: 'var(--color-fault-text)', border: 'var(--color-fault-border)' },
  WARNING:     { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)', border: 'var(--color-warning-border)' },
  INFO:        { bg: 'var(--color-telemetry-bg)', text: 'var(--color-telemetry-text)', border: 'var(--color-telemetry-border)' },
  RESOLVED:    { bg: 'var(--color-healthy-bg)', text: 'var(--color-healthy-text)', border: 'var(--color-healthy-border)' },
  ACTIVE:      { bg: 'var(--color-fault-bg)', text: 'var(--color-fault-text)', border: 'var(--color-fault-border)' },
  DISPATCHED:  { bg: 'var(--color-surface-alt)', text: 'var(--color-ink-muted)', border: 'var(--color-hairline)' },
  ISSUED:      { bg: 'var(--color-fault-bg)', text: 'var(--color-fault-text)', border: 'var(--color-fault-border)' },
  'N/A':       { bg: 'var(--color-surface-alt)', text: 'var(--color-ink-muted)', border: 'var(--color-hairline)' },
};

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

export default function Badge({ variant, children, className }: BadgeProps) {
  const style = BADGE_STYLES[variant];
  return (
    <span
      className={clsx('inline-block font-mono uppercase', className)}
      style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.06em',
        padding: '2px 7px',
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: 6,
      }}
    >
      {children ?? variant}
    </span>
  );
}
