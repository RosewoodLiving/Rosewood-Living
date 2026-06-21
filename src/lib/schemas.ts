import { z } from "zod";

/**
 * Shared validation for both lead forms. Server is the source of truth;
 * the React islands do only light client-side checks.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(160)
  .regex(EMAIL, "Enter a valid email address");

const consent = z
  .string()
  .optional()
  .refine((v) => v === "yes", "Consent is required");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length ? v : undefined));

export const enquirySchema = z.object({
  leadType: z.literal("general_enquiry"),
  name: z.string().trim().min(1, "Name is required").max(120),
  company: z.string().trim().min(1, "Company is required").max(160),
  email,
  phone: optionalText(40),
  projectStage: optionalText(80),
  message: z.string().trim().min(1, "A short message is required").max(4000),
  consent,
});

export const loiSchema = z.object({
  leadType: z.literal("letter_of_intent"),
  fullName: z.string().trim().min(1, "Name is required").max(120),
  role: z.string().trim().min(1, "Role is required").max(120),
  company: z.string().trim().min(1, "Company is required").max(160),
  email,
  phone: z.string().trim().min(1, "Phone is required").max(40),
  projectLocation: z.string().trim().min(1, "Project location is required").max(160),
  projectType: z.string().trim().min(1, "Project type is required").max(80),
  projectStage: z.string().trim().min(1, "Project stage is required").max(80),
  dwellings: optionalText(20),
  message: optionalText(4000),
  consent,
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type LoiInput = z.infer<typeof loiSchema>;

/** Flattened first error message for a friendly response. */
export function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? "Please check the form and try again.";
}
