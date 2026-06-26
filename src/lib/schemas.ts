import { z } from "zod";

/**
 * Shared validation for both lead forms. Server is the source of truth;
 * the React islands do only light client-side checks.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email = z
  .string()
  .trim()
  .min(1, "is required")
  .max(160)
  .regex(EMAIL, "must be a valid email address");

const consent = z
  .string()
  .optional()
  .refine((v) => v === "yes", "please tick the box to continue");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length ? v : undefined));

/** Optional whole-number field captured as a trimmed digit string. */
const optionalNumber = (max = 12) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^\d*$/, "must be a whole number")
    .optional()
    .transform((v) => (v && v.length ? v : undefined));

export const enquirySchema = z.object({
  leadType: z.literal("general_enquiry"),
  name: z.string().trim().min(1, "is required").max(120),
  company: z.string().trim().min(1, "is required").max(160),
  email,
  phone: optionalText(40),
  projectStage: optionalText(80),
  message: z.string().trim().min(1, "is required").max(4000),
  consent,
});

export const loiSchema = z.object({
  leadType: z.literal("letter_of_intent"),
  fullName: z.string().trim().min(1, "is required").max(120),
  role: z.string().trim().min(1, "is required").max(120),
  company: z.string().trim().min(1, "is required").max(160),
  email,
  phone: z.string().trim().min(1, "is required").max(40),
  projectLocation: z.string().trim().min(1, "is required").max(200),
  developmentTypes: z
    .string()
    .trim()
    .min(1, "please select at least one option")
    .max(400)
    .refine((v) => v.split(",").filter((s) => s.trim().length).length >= 1, {
      message: "please select at least one option",
    }),
  projectStage: z.string().trim().min(1, "is required").max(80),
  dwellings: z
    .string()
    .trim()
    .min(1, "is required")
    .max(12)
    .regex(/^\d+$/, "must be a whole number"),
  totalApartments: optionalNumber(),
  affordableApartments: optionalNumber(),
  boardingRooms: optionalNumber(),
  coLivingRooms: optionalNumber(),
  servicedApartments: optionalNumber(),
  retailAreaSqm: optionalNumber(),
  commercialAreaSqm: optionalNumber(),
  message: optionalText(4000),
  consent,
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type LoiInput = z.infer<typeof loiSchema>;

/** Human-readable labels for every field, so errors can name the offending field. */
const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  name: "Full name",
  role: "Role",
  company: "Company",
  email: "Email",
  phone: "Phone",
  projectLocation: "Project site address",
  developmentTypes: "Type of development",
  projectStage: "Project stage",
  dwellings: "Total number of dwellings",
  totalApartments: "Total apartments",
  affordableApartments: "Affordable apartments",
  boardingRooms: "Boarding rooms",
  coLivingRooms: "Co-living rooms",
  servicedApartments: "Serviced apartments",
  retailAreaSqm: "Retail floor area",
  commercialAreaSqm: "Commercial floor area",
  message: "Message",
  consent: "Consent",
};

/** First validation error, named by field so the user knows exactly what to fix. */
export function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Please check the form and try again.";

  const key = String(issue.path[0] ?? "");
  const label = FIELD_LABELS[key];

  // Zod's raw type errors (e.g. "expected string, received undefined") aren't friendly.
  const message = /expected|received|invalid input|required/i.test(issue.message)
    ? "is required"
    : issue.message;

  return label ? `${label} — ${message}` : "Please check the form and try again.";
}
