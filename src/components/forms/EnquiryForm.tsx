import { useState } from "react";
import { Field, Input, Textarea, Select, Consent, SubmitButton, ErrorNote } from "./fields";

type Status = "idle" | "submitting" | "success" | "error";

export default function EnquiryForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    if (!payload.consent) {
      setError("Please confirm consent so we can reply.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, leadType: "general_enquiry" }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Something went wrong. Please try again.");
      setStatus("success");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-3 rounded-2xl border border-line bg-surface p-8">
        <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: "var(--color-sage)" }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fbf6ec" strokeWidth="1.8">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h3 className="font-display text-2xl">Thank you — message received.</h3>
        <p className="text-ink-soft">
          One of our advisors will be in touch shortly to talk through your project and where the
          affordable-housing advantages could take it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="g-name" required>
          <Input id="g-name" name="name" autoComplete="name" required placeholder="Jordan Avery" />
        </Field>
        <Field label="Company" htmlFor="g-company" required>
          <Input id="g-company" name="company" autoComplete="organization" required placeholder="Avery Developments" />
        </Field>
        <Field label="Email" htmlFor="g-email" required>
          <Input id="g-email" name="email" type="email" autoComplete="email" required placeholder="you@company.com.au" />
        </Field>
        <Field label="Phone" htmlFor="g-phone">
          <Input id="g-phone" name="phone" type="tel" autoComplete="tel" placeholder="+61…" />
        </Field>
        <Field label="Project stage" htmlFor="g-stage" className="sm:col-span-2">
          <Select id="g-stage" name="projectStage" defaultValue="">
            <option value="" disabled>Select a stage…</option>
            <option>Just exploring</option>
            <option>Site identified</option>
            <option>Feasibility / concept</option>
            <option>Planning / DA</option>
            <option>Approved / pre-construction</option>
            <option>Under construction</option>
          </Select>
        </Field>
      </div>
      <Field label="How can we help?" htmlFor="g-message" required>
        <Textarea id="g-message" name="message" rows={4} required placeholder="Tell us a little about your site, your goals, and where you'd like guidance." />
      </Field>
      <Consent id="g-consent" />
      <ErrorNote message={error} />
      <SubmitButton busy={status === "submitting"}>Send enquiry</SubmitButton>
    </form>
  );
}
