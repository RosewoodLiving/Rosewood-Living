import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const base =
  "w-full rounded-[2px] border border-line bg-surface px-4 py-3.5 text-[0.95rem] text-ink placeholder:text-muted/70 transition-colors duration-300 focus:border-ink focus:outline-none";

export function Field({
  label,
  htmlFor,
  required,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex h-full flex-col ${className}`}>
      <label
        htmlFor={htmlFor}
        className="mb-2 flex items-baseline justify-between gap-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-ink-soft"
      >
        <span>
          {label}
          {required ? <span className="text-rosewood"> *</span> : null}
        </span>
        {hint ? <span className="shrink-0 text-muted">{hint}</span> : null}
      </label>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${base} resize-none ${props.className ?? ""}`} />;
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${base} appearance-none bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10 ${props.className ?? ""}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%238b7a66' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
      }}
    >
      {children}
    </select>
  );
}

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%238b7a66' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(option: string) {
    onChange(
      value.includes(option) ? value.filter((v) => v !== option) : [...value, option],
    );
  }

  const summary =
    value.length === 0
      ? placeholder
      : value.length <= 2
        ? value.join(", ")
        : `${value.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${base} flex items-center justify-between gap-2 bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10 text-left`}
        style={{ backgroundImage: chevron }}
      >
        <span className={value.length === 0 ? "text-muted/70" : "text-ink"}>{summary}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[2px] border border-line bg-surface py-1 shadow-[0_20px_40px_-24px_rgba(36,27,20,0.55)]"
        >
          {options.map((option) => {
            const checked = value.includes(option);
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[0.9rem] text-ink transition-colors hover:bg-line/40"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option)}
                  className="shrink-0 accent-rosewood"
                  style={{ width: "1rem", height: "1rem" }}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Consent({ id }: { id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[0.85rem] text-ink-soft">
      <input
        id={id}
        name="consent"
        type="checkbox"
        value="yes"
        className="mt-0.5 shrink-0 accent-rosewood"
        style={{ width: "1.05rem", height: "1.05rem" }}
      />
      <span>
        I agree that Rosewood Living may use these details to respond to my enquiry, in
        line with its{" "}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener"
          onClick={(e) => e.stopPropagation()}
          className="text-rosewood underline underline-offset-2 hover:text-rosewood-deep"
        >
          privacy policy
        </a>
        .
      </span>
    </label>
  );
}

export function SubmitButton({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <button type="submit" disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-60">
      {busy ? "Sending…" : children}
      {!busy && (
        <span className="btn__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-[2px] border border-rosewood/25 bg-rosewood/8 px-4 py-3 text-[0.85rem] text-rosewood-deep">
      {message}
    </p>
  );
}
