'use client';

import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Loader2, FileCheck, Lock, ChevronLeft } from 'lucide-react';
import { useBhashini } from '@/lib/bhashini';

interface DigiLockerLoginProps {
  onSuccess: () => void;
}

/**
 * DigiLocker technician verification.
 *
 * This is a self-contained Aadhaar + OTP flow, not a wired OAuth handshake — the
 * UIDAI/DigiLocker sandbox is not reachable from a demo deployment. It is labelled
 * as a simulation in the copy so no one mistakes it for a real identity check.
 * Swap `handleAadhaarSubmit` / `handleOtpSubmit` for the real
 * `https://api.digilocker.gov.in` endpoints to make it live; nothing else moves.
 */
export function DigiLockerLogin({ onSuccess }: DigiLockerLoginProps) {
  const { t, language } = useBhashini();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleAadhaarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aadhaar.length !== 12) return;
    setIsChecking(true);
    // Stands in for the DigiLocker OTP request round-trip.
    setTimeout(() => {
      setIsChecking(false);
      setStep(2);
    }, 700);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setStep(3);
      setTimeout(onSuccess, 1200);
    }, 700);
  };

  return (
    <div className="flex flex-col items-center w-full p-5 text-[var(--text-primary)]">
      <div className="w-14 h-14 bg-[var(--accent-subtle)] rounded-full flex items-center justify-center mb-4 border border-[var(--accent)]">
        <ShieldCheck className="w-7 h-7 text-[var(--accent)]" />
      </div>

      <h2 className="text-lg font-bold mb-1 text-center">
        {t('DigiLocker Auth')}
      </h2>
      <p className="text-xs text-[var(--text-secondary)] text-center mb-1 max-w-xs">
        {t('Verify you are a certified IMD technician to unlock this node.')}
      </p>
      <p className="text-[10px] text-[var(--text-muted)] mb-6 flex items-center gap-1.5">
        <Lock className="w-3 h-3" />
        {language === 'hi'
          ? 'DigiLocker सैंडबॉक्स — असली सत्यापन यहाँ नहीं होता।'
          : 'DigiLocker sandbox — identity is not really verified in this demo.'}
      </p>

      {step === 1 && (
        <form onSubmit={handleAadhaarSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <label
              htmlFor="dl-aadhaar"
              className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-[var(--text-muted)]"
            >
              {t('Aadhaar Number')}
            </label>
            <input
              id="dl-aadhaar"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="0000 0000 0000"
              className="w-full bg-[var(--surface-sunken)] border border-[var(--border-strong)] rounded-xl p-3 text-lg font-mono tracking-[0.3em] text-center text-[var(--text-primary)] min-touch transition-colors focus:border-[var(--accent)]"
              required
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center font-mono">
              {aadhaar.length}/12
            </p>
          </div>
          <button
            type="submit"
            disabled={aadhaar.length !== 12 || isChecking}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors min-touch disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t('Send OTP')}
            {!isChecking && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleOtpSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <label
              htmlFor="dl-otp"
              className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-[var(--text-muted)]"
            >
              {t('Enter OTP sent to mobile')}
            </label>
            <input
              id="dl-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-[var(--surface-sunken)] border border-[var(--border-strong)] rounded-xl p-3 text-2xl font-mono tracking-[0.4em] text-center text-[var(--text-primary)] min-touch transition-colors focus:border-[var(--accent)]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={otp.length !== 6 || isChecking}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors min-touch disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t('Verify Identity')}
            {!isChecking && <ShieldCheck className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => { setOtp(''); setStep(1); }}
            className="w-full text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1.5 min-touch"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t('Change Aadhaar Number')}
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center space-y-3 py-8 animate-in fade-in zoom-in duration-300">
          <div className="w-14 h-14 bg-[var(--status-nominal-bg)] rounded-full flex items-center justify-center border border-[var(--status-nominal)]">
            <FileCheck className="w-7 h-7 text-[var(--status-nominal-ink)] animate-pulse" />
          </div>
          <p className="font-bold text-base text-[var(--status-nominal-ink)]">
            {t('Technician Verified')}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{t('Unlocking IMD Node...')}</p>
        </div>
      )}
    </div>
  );
}
