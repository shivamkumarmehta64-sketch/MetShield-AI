import type { Metadata } from 'next';
import RealTimeQCCanvas from '@/components/features/RealTimeQCCanvas';

export const metadata: Metadata = {
  title: 'Live QC Canvas | MetShield AI',
  description:
    'Interactive three-parameter quality-control canvas: temperature, pressure and humidity evaluated by the WMO-No. 8 rule engine as they arrive.',
};

/**
 * The interactive QC canvas.
 *
 * Formerly mounted at `/`. It is a single-station working surface, not the
 * site's front door: it starts reading the moment it mounts and carries no
 * statement of what the project is or what its data mode means. The landing
 * page explains the system and links here.
 */
export default function CanvasPage() {
  return <RealTimeQCCanvas />;
}
