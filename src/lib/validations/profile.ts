import { z } from "zod";

export const personalInfoSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres").max(50),
  lastName: z.string().min(2, "Mínimo 2 caracteres").max(50),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-().]{7,20}$/, "Número de teléfono inválido")
    .optional()
    .or(z.literal("")),
  city: z.string().min(2, "Ciudad requerida").max(100),
  country: z.string().min(2, "País requerido").max(100),
  timezone: z.string().min(1, "Zona horaria requerida"),
  bio: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Contraseña actual requerida"),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
