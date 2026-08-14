import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

const LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}

/**
 * Six individual digit boxes, matching Backoffice.dc.html's B0.5 frame
 * exactly (44x52px boxes, gold focus ring on the active box) rather than
 * one text input with maxLength — auto-advances on entry, steps back on
 * backspace, and splits a pasted code across all six boxes at once.
 */
export function OtpInput({ value, onChange, onComplete, disabled }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("").slice(0, LENGTH);
    onChange(joined);
    if (joined.length === LENGTH) onComplete?.(joined);
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, digit);
    if (digit && index < LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    if (pasted.length === LENGTH) onComplete?.(pasted);
    inputRefs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  return (
    <div className="flex justify-center gap-2.5">
      {digits.map((digit, index) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          autoFocus={index === 0}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          className="h-[52px] w-11 rounded-[10px] border border-bo-input-border bg-bo-surface text-center font-sans text-[22px] font-semibold text-bo-ink outline-none focus:border-2 focus:border-bo-gold disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export default OtpInput;
