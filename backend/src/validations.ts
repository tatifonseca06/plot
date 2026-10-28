import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Escribe un correo válido.")
  .max(254);
const password = z
  .string()
  .min(8, "La contraseña necesita al menos 8 caracteres.")
  .max(128, "La contraseña admite hasta 128 caracteres.");
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Escribe tu nombre.").max(120),
    email,
    password,
    confirmPassword: z.string(),
    role: z.enum(["PARTICIPANT", "ORGANIZER"]).default("PARTICIPANT"),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas deben coincidir.",
    path: ["confirmPassword"],
  });
export const loginSchema = z.object({ email, password }).strict();
export const experienceSchema = z
  .object({
    title: z.string().trim().min(1, "Escribe un título.").max(100),
    category: z.string().trim().min(1, "Selecciona una categoría.").max(40),
    subcategoryId: z.string().uuid("Selecciona una subcategoría."),
    description: z.string().trim().min(1, "Escribe una descripción.").max(500),
  })
  .strict();
export const idSchema = z.string().uuid("Identificador no válido.");
export const adminExperienceSchema = experienceSchema.extend({
  ownerId: idSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type AdminExperienceInput = z.infer<typeof adminExperienceSchema>;
