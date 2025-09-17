import { z } from "zod";

// MongoDB Document Interfaces
export interface Province {
  _id?: string;
  id: string;
  name: string;
  createdAt: Date;
}

export interface User {
  _id?: string;
  id: string;
  username: string;
  email: string;
  password: string;
  name: string;
  role: "admin" | "leader";
  provinceId: string; // Reference to province
  isProvisional: boolean;
  createdAt: Date;
}

export interface Donor {
  _id?: string;
  id: string;
  biNumber: string;
  fullName: string;
  birthDate: string;
  age: number;
  gender: string; // "M" or "F"
  municipality: string;
  neighborhood: string;
  contact: string;
  position: string;
  department: string; // "delegacao", "programas", "juventude", "outro"
  bloodType: string; // "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"
  rhFactor: string; // "positive" or "negative"
  hasHistory: boolean;
  previousDonations: number;
  lastDonation: string;
  medicalRestrictions: string;
  isAptToDonate: boolean;
  availableForFuture: boolean;
  preferredContact: string; // "call", "sms", "email", "whatsapp"
  observations: string;
  provinceId: string; // Reference to province
  createdBy: string; // Reference to user who created this donor
  createdAt: Date;
  updatedAt: Date;
}

export interface Donation {
  _id?: string;
  id: string;
  donorId: string;
  donationDate: string;
  donationTime: string;
  notes: string;
  createdAt: Date;
}

export interface PasswordResetToken {
  _id?: string;
  id: string;
  email: string;
  tokenHash: string; // Hashed version of the actual token
  expiresAt: Date;
  usedAt?: Date; // Set when token is used (single-use enforcement)
  createdAt: Date;
}

// Zod Validation Schemas
export const provinceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome da província é obrigatório"),
  createdAt: z.date(),
});

export const userSchema = z.object({
  id: z.string(),
  username: z.string().min(1, "Username é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Password é obrigatória"),
  name: z.string().min(1, "Nome é obrigatório"),
  role: z.enum(["admin", "leader"], { required_error: "Role é obrigatório" }),
  provinceId: z.string().min(1, "Província é obrigatória"),
  isProvisional: z.boolean().default(true),
  createdAt: z.date(),
});

export const donorSchema = z.object({
  id: z.string(),
  biNumber: z.string().min(1, "Número do BI é obrigatório"),
  fullName: z.string().min(1, "Nome completo é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  age: z.number().min(1, "Idade deve ser maior que 0"),
  gender: z.enum(["M", "F"], { required_error: "Gênero é obrigatório" }),
  municipality: z.string().min(1, "Município é obrigatório"),
  neighborhood: z.string().default(""),
  contact: z.string().default(""),
  position: z.string().default(""),
  department: z.string().default(""),
  bloodType: z.enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"], {
    required_error: "Tipo sanguíneo é obrigatório"
  }),
  rhFactor: z.enum(["positive", "negative"], {
    required_error: "Fator RH é obrigatório"
  }),
  hasHistory: z.boolean().default(false),
  previousDonations: z.number().default(0),
  lastDonation: z.string().default(""),
  medicalRestrictions: z.string().default(""),
  isAptToDonate: z.boolean().default(true),
  availableForFuture: z.boolean().default(true),
  preferredContact: z.enum(["call", "sms", "email", "whatsapp"]).default("call"),
  observations: z.string().default(""),
  provinceId: z.string().min(1, "Província é obrigatória"),
  createdBy: z.string().min(1, "Criado por é obrigatório"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const donationSchema = z.object({
  id: z.string(),
  donorId: z.string().min(1, "ID do doador é obrigatório"),
  donationDate: z.string().min(1, "Data da doação é obrigatória"),
  donationTime: z.string().min(1, "Hora da doação é obrigatória"),
  notes: z.string().default(""),
  createdAt: z.date(),
});

export const passwordResetTokenSchema = z.object({
  id: z.string(),
  email: z.string().email("Email inválido"),
  tokenHash: z.string().min(1, "Token hash é obrigatório"),
  expiresAt: z.date(),
  usedAt: z.date().optional(),
  createdAt: z.date(),
});

// Insert schemas (omitting auto-generated fields)
export const insertProvinceSchema = provinceSchema.omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
});

export const insertDonorSchema = donorSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Form schema for donor (omits createdBy as it's set by the server)
export const donorFormSchema = donorSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const insertDonationSchema = donationSchema.omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = passwordResetTokenSchema.omit({
  id: true,
  createdAt: true,
});

// Form validation schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Password é obrigatória"),
  provinceId: z.string().optional(), // Optional for admins who have access to all provinces
});

export const resetPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password atual é obrigatória"),
  newPassword: z.string().min(6, "Nova password deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords não coincidem",
  path: ["confirmPassword"],
});

export const donorSearchSchema = z.object({
  query: z.string().optional(),
  bloodType: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
  municipality: z.string().optional(),
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
  isAptToDonate: z.boolean().optional(),
  availableForFuture: z.boolean().optional(),
  department: z.string().optional(),
  hasHistory: z.boolean().optional(),
  provinceId: z.string().optional(),
  createdDateFrom: z.string().optional(),
  createdDateTo: z.string().optional(),
  lastDonationFrom: z.string().optional(),
  lastDonationTo: z.string().optional(),
  sortBy: z.enum(["name", "age", "bloodType", "createdAt", "lastDonation"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const newLeaderSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  provinceId: z.string().min(1, "Província é obrigatória"),
});

export const updateLeaderSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  provinceId: z.string().min(1, "Província é obrigatória"),
});

export const passwordRecoverySchema = z.object({
  email: z.string().email("Email inválido"),
  provinceId: z.string().optional(),
});

export const newAdminSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  username: z.string().min(1, "Username é obrigatório"),
  provinceId: z.string().min(1, "Província é obrigatória"),
});

// Export schemas
export const exportDonorsSchema = z.object({
  query: z.string().optional(),
  bloodType: z.string().optional(),
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

export const exportDonationsSchema = z.object({
  donorId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

export const exportReportSchema = z.object({
  type: z.enum(["overview", "bloodtype", "monthly"]).default("overview"),
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

// API Response Types
export interface DonorStats {
  totalDonors: number;
  totalDonations: number;
  activeDonors: number;
  newThisMonth: number;
  bloodTypeStats: Record<string, { count: number; percentage: number }>;
}

export interface RecentDonation extends Donation {
  donorName: string;
  donorBiNumber: string;
  bloodType: string;
}

// Type exports
export type InsertProvince = z.infer<typeof insertProvinceSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type DonorFormData = z.infer<typeof donorFormSchema>;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type DonorSearchData = z.infer<typeof donorSearchSchema>;
export type NewLeaderData = z.infer<typeof newLeaderSchema>;
export type UpdateLeaderData = z.infer<typeof updateLeaderSchema>;
export type PasswordRecoveryData = z.infer<typeof passwordRecoverySchema>;
export type NewAdminData = z.infer<typeof newAdminSchema>;
export type ExportDonorsData = z.infer<typeof exportDonorsSchema>;
export type ExportDonationsData = z.infer<typeof exportDonationsSchema>;
export type ExportReportData = z.infer<typeof exportReportSchema>;