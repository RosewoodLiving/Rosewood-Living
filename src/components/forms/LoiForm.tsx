import { useMemo, useState } from "react";
import {
  Field,
  Input,
  Textarea,
  Select,
  MultiSelect,
  Consent,
  SubmitButton,
  ErrorNote,
} from "./fields";

type Status = "idle" | "submitting" | "success" | "error";

const DEVELOPMENT_TYPES = [
  "Mixed use",
  "Apartments / Units",
  "Boarding house",
  "Co-living housing",
  "Serviced apartments",
  "Villas",
  "Townhouses",
  "Manor houses",
  "Duplexes",
  "Houses",
];

/** Which breakdown fields each development type reveals. */
const TYPE_FIELD_MAP: Record<string, string[]> = {
  "Mixed use": [
    "retailAreaSqm",
    "commercialAreaSqm",
    "totalApartments",
    "affordableApartments",
    "coLivingRooms",
    "boardingRooms",
  ],
  "Apartments / Units": ["totalApartments", "affordableApartments", "boardingRooms", "coLivingRooms"],
  "Boarding house": ["boardingRooms"],
  "Co-living housing": ["coLivingRooms"],
  "Serviced apartments": ["servicedApartments"],
};

/** Canonical render order + labels for the breakdown inputs. */
const BREAKDOWN_FIELDS: { name: string; label: string; hint?: string }[] = [
  { name: "retailAreaSqm", label: "Retail area (m²)" },
  { name: "commercialAreaSqm", label: "Commercial area (m²)" },
  { name: "totalApartments", label: "Total apartments" },
  { name: "affordableApartments", label: "Affordable apartments" },
  { name: "boardingRooms", label: "Boarding rooms" },
  { name: "coLivingRooms", label: "Co-living rooms" },
  { name: "servicedApartments", label: "Serviced apartments" },
];

function downloadPdf(base64: string, fileName: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function LoiForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [types, setTypes] = useState<string[]>([]);

  // Union of breakdown fields revealed by the selected types, in canonical order.
  const visibleFields = useMemo(() => {
    const keys = new Set<string>();
    for (const t of types) for (const k of TYPE_FIELD_MAP[t] ?? []) keys.add(k);
    return BREAKDOWN_FIELDS.filter((f) => keys.has(f.name));
  }, [types]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    if (types.length === 0) {
      setError("Please pick at least one type of development.");
      setStatus("error");
      return;
    }

    if (!payload.consent) {
      setError("Please confirm consent so we can issue your letter.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/letter-of-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, leadType: "letter_of_intent" }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        pdfBase64?: string;
        fileName?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.message || "Something went wrong. Please try again.");
      if (json.pdfBase64) downloadPdf(json.pdfBase64, json.fileName || "Rosewood-Living-Letter-of-Intent.pdf");
      setStatus("success");
      form.reset();
      setTypes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-8">
        <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: "var(--color-sage)" }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fbf6ec" strokeWidth="1.8">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h3 className="font-display text-2xl">Your Letter of Intent is on its way.</h3>
        <p className="text-ink-soft">
          A personalised copy is downloading now, and we&rsquo;ve emailed it to you as well. Our
          team has been notified and will follow up to take the next step with you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="l-name" required>
          <Input id="l-name" name="fullName" autoComplete="name" required placeholder="Jordan Avery" />
        </Field>
        <Field label="Role" htmlFor="l-role" required>
          <Input id="l-role" name="role" required placeholder="Development Director" />
        </Field>
        <Field label="Company" htmlFor="l-company" required className="sm:col-span-2">
          <Input id="l-company" name="company" autoComplete="organization" required placeholder="Avery Developments Pty Ltd" />
        </Field>
        <Field label="Email" htmlFor="l-email" required>
          <Input id="l-email" name="email" type="email" autoComplete="email" required placeholder="you@company.com.au" />
        </Field>
        <Field label="Phone" htmlFor="l-phone" required>
          <Input id="l-phone" name="phone" type="tel" autoComplete="tel" required placeholder="+61…" />
        </Field>
        <Field label="Project site address" htmlFor="l-location" required className="sm:col-span-2">
          <Input
            id="l-location"
            name="projectLocation"
            autoComplete="street-address"
            required
            placeholder="12 Smith St, Eastwood NSW 2122"
          />
        </Field>
        <Field label="Project stage" htmlFor="l-stage" required>
          <Select id="l-stage" name="projectStage" defaultValue="" required>
            <option value="" disabled>Select a stage…</option>
            <option>Feasibility / concept</option>
            <option>Planning / DA</option>
            <option>Approved / pre-construction</option>
            <option>Under construction</option>
          </Select>
        </Field>
        <Field
          label="Pick all the types of dwellings in your development"
          htmlFor="l-types"
          required
          className="sm:col-span-2"
        >
          <MultiSelect
            options={DEVELOPMENT_TYPES}
            value={types}
            onChange={setTypes}
            placeholder="Select development type(s)…"
          />
          <input type="hidden" name="developmentTypes" value={types.join(",")} />
        </Field>
        <Field label="Total number of dwellings" htmlFor="l-dwellings" required>
          <Input id="l-dwellings" name="dwellings" type="number" min={0} required placeholder="e.g. 80" />
        </Field>

        {visibleFields.length > 0 && (
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
            {visibleFields.map((f) => (
              <Field key={f.name} label={f.label} htmlFor={`l-${f.name}`} hint={f.hint}>
                <Input id={`l-${f.name}`} name={f.name} type="number" min={0} placeholder="0" />
              </Field>
            ))}
          </div>
        )}
      </div>
      <Field label="Anything we should know?" htmlFor="l-message">
        <Textarea id="l-message" name="message" rows={3} placeholder="Site context, timing, or specific questions." />
      </Field>
      <Consent id="l-consent" />
      <ErrorNote message={error} />
      <SubmitButton busy={status === "submitting"}>Generate my Letter of Intent</SubmitButton>
      <p className="text-center text-[0.78rem] text-muted">
        Instant PDF download &middot; Emailed copy &middot; No obligation
      </p>
    </form>
  );
}
