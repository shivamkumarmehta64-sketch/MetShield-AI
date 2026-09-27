import { clsx } from 'clsx';

type BadgeVariant = 'NOMINAL' | 'FLAGGED' | 'QUARANTINED' | 'OFFLINE' | 'IMPUTED' | 'SEVERE' | 'WARNING' | 'INFO' | 'RESOLVED' | 'ACTIVE' | 'DISPATCHED' | 'ISSUED' | 'N/A';

const BADGE_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  NOMINAL:     { bg: '#0D1F0D', text: '#1DB31D', border: '#1A7A1A' },
  FLAGGED:      { bg: '#1F1800', text: '#CCA300', border: '#7A5A00' },
  QUARANTINED: { bg: '#1F0508', text: '#C0162C', border: '#C0162C' },
  OFFLINE:     { bg: '#141414', text: '#3D3D3D', border: '#2A2A2A' },
  IMPUTED:     { bg: '#0A0F1F', text: '#5588CC', border: '#1A3A6A' },
  SEVERE:      { bg: '#1F0508', text: '#C0162C', border: '#C0162C' },
  WARNING:     { bg: '#1F1800', text: '#CCA300', border: '#7A5A00' },
  INFO:        { bg: '#0A0F1F', text: '#5588CC', border: '#1A3A6A' },
  RESOLVED:    { bg: '#E8F5E8', text: '#1A7A1A', border: '#A8D8A8' },
  ACTIVE:      { bg: '#FFE8EB', text: '#C0162C', border: '#E8B0B8' },
  DISPATCHED:  { bg: '#F7F7F7', text: '#3D3D3D', border: '#D0D0D0' },
  ISSUED:      { bg: '#1F0508', text: '#C0162C', border: '#C0162C' },
  'N/A':       { bg: '#141414', text: '#2A2A2A', border: '#2A2A2A' },
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
        borderRadius: 0,
      }}
    >
      {children ?? variant}
    </span>
  );
}
