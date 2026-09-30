'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { EVALUATE_STORM_RULE, stormRuleAsText } from '@/lib/engineRules';

/**
 * Engine rule inspector — the load-bearing rule, shown as it is written.
 * ----------------------------------------------------------------------
 * The decision chain on this page is a diagram. This is the other half of the
 * promise the page makes: the arithmetic itself. A judge who does not believe
 * the diagram can read the four lines the engine actually executes and check
 * them against the repository.
 *
 * Everything rendered here comes from `lib/engineRules.ts`, which is verified
 * against `lib/anomalyLogic.ts` by `__tests__/engineRules.test.ts`. There are no
 * thresholds typed into this file — if the engine's numbers change, the guard
 * test fails and this panel is corrected in the same commit.
 *
 * Deliberately NOT an IDE. No gutter, no line numbers to go stale, no window
 * chrome, no scroll region. It is a proof panel: the rule, its three measured
 * bounds, and the expression. One column, no chrome, nothing that competes
 * with the copy it is quoting.
 */

const CHANNEL_TINT: Record<string, string> = {
  PRESSURE: 'var(--color-met-pressure)',
  HUMIDITY: 'var(--color-met-humidity)',
  TEMPERATURE: 'var(--color-met-temperature)',
};

export default function EngineRuleInspector() {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A copy confirmation that outlives its component is a setState-after-unmount
  // warning in every framework that counts. Clear it either way.
  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  async function copyRule() {
    try {
      await navigator.clipboard.writeText(stormRuleAsText());
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused in some embedded and non-secure contexts.
      // Failing silently is correct here: the rule is on screen to be read.
      setCopied(false);
    }
  }

  return (
    <div className="ms-inspect">
      <header className="ms-inspect-head">
        <div className="min-w-0">
          <div className="ms-inspect-stage">{EVALUATE_STORM_RULE.stage}</div>
          <p className="ms-inspect-headline">{EVALUATE_STORM_RULE.headline}</p>
        </div>
        <div className="flex gap-2 ml-auto shrink-0">
          <button
            type="button"
            onClick={copyRule}
            className="ms-inspect-copy"
            aria-label={`Copy the ${EVALUATE_STORM_RULE.stage} rule as displayed`}
          >
            {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
            <span>{copied ? 'Copied' : 'Copy rule'}</span>
          </button>
          <a
            href="#qc-engine"
            className="ms-inspect-copy bg-navy text-white hover:bg-navy-deep"
            aria-label="Inspect evaluate() source in code"
          >
            <span>INSPECT ENGINE RULE</span>
          </a>
        </div>
      </header>

      {/* Threshold display. Every number here is the engine's own; the AND
          chain is the conjunction the classification depends on. */}
      <ol className="ms-inspect-evidence">
        {EVALUATE_STORM_RULE.evidence.map((e, i) => (
          <li key={e.channel} className="ms-inspect-row">
            <span className="ms-inspect-idx" aria-hidden>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="ms-inspect-sym" style={{ color: CHANNEL_TINT[e.channel] }}>
              {e.symbol}
            </span>
            <span className="ms-inspect-op" aria-hidden>
              {e.operator}
            </span>
            <span className="ms-inspect-val">{e.value}</span>
            {i < EVALUATE_STORM_RULE.evidence.length - 1 && (
              <span className="ms-inspect-and" aria-hidden>
                AND
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* The expression itself, exactly as evaluate() writes it. */}
      <pre className="ms-inspect-code">
        <code>
          {EVALUATE_STORM_RULE.source.map((line, i) => (
            <span key={i} className="ms-inspect-cline">
              {line.startsWith('//') ? <span className="ms-inspect-comment">{line}</span> : line}
            </span>
          ))}
        </code>
      </pre>

      <footer className="ms-inspect-foot">
        <span className="ms-inspect-attr">
          <span className="ms-inspect-attr-k">source</span>
          <span className="ms-inspect-attr-v">
            {EVALUATE_STORM_RULE.sourceFile} · {EVALUATE_STORM_RULE.sourceFn}
          </span>
        </span>
        <div className="flex gap-2 mt-2">
          <a
            href="#qc-engine"
            className="text-[10px] font-mono text-ink-muted hover:text-navy underline"
          >
            VIEW evaluate() →
          </a>
        </div>
        <p className="ms-inspect-rationale">{EVALUATE_STORM_RULE.rationale}</p>
      </footer>
    </div>
  );
}