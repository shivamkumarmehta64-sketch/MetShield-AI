'use client';

import { SystemProvider } from './SystemContext';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return <SystemProvider>{children}</SystemProvider>;
}
