import type { ReactNode } from "react";

const base =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-[0.98rem] text-ink placeholder:text-muted/70 transition-colors duration-300 focus:border-rosewood focus:outline-none focus:ring-2 focus:ring-rosewood/25";

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
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-baseline justify-between text-[0.82rem] font-medium text-ink-soft"
      >
        <span>
          {label}
          {required ? <span className="text-rosewood"> *</span> : null}
        </span>
        {hint ? <span className="text-muted">{hint}</span> : null}
      </label>
      {children}
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
        line with its privacy policy.
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
    <p className="rounded-lg bg-rosewood/8 px-4 py-3 text-[0.85rem] text-rosewood-deep">
      {message}
    </p>
  );
}
