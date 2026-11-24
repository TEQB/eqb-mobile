import { z } from "zod";
import { validatePassword } from "./password";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  matricNumber: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z
      .string()
      .regex(
        /^(125\/\d{2}\/[12]\/\d{4}|[A-Za-z0-9]{10,20})$/,
        "Format: 125/XX/Y/ZZZZ or reg number (e.g. 202330898491GA)",
      )
      .optional(),
  ),
  facultyId: z.string().uuid(),
  programmeId: z.string().uuid(),
  currentLevel: z.preprocess(
    (v) => (v ? Number(v) : v),
    z.number().int().min(100).max(600),
  ),
});

export const setPasswordSchema = z
  .object({
    email: z.string().email().optional(),
    matricNumber: z.string().optional(),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const result = validatePassword(data.password, {
      email: data.email,
      matricNumber: data.matricNumber,
    });
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error, path: ["password"] });
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const sendOtpSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(100).optional(),
  matricNumber: z
    .string()
    .regex(
      /^(125\/\d{2}\/[12]\/\d{4}|[A-Za-z0-9]{10,20})$/,
      "Format: 125/XX/Y/ZZZZ or reg number (e.g. 202330898491GA)",
    )
    .optional(),
  programmeId: z.string().uuid().optional(),
  currentLevel: z.preprocess(
    (v) => (v ? Number(v) : v),
    z.number().int().min(100).max(600).optional(),
  ),
});

export const createAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const uploadSchema = z.object({
  courseId: z.string().uuid(),
  year: z.preprocess(
    (v) => (v ? Number(v) : v),
    z.number().int().min(1990).max(new Date().getFullYear()),
  ),
  semester: z.enum(["first", "second"]),
  examType: z.enum(["mid_semester", "examination"]).default("examination"),
});

export const solutionSchema = z.object({
  body: z.string().min(1, "Solution text is required").optional().or(z.literal("")),
});

export const feedbackSchema = z.object({
  message: z.string().min(10).max(2000),
});
