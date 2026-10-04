"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { User, UserRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// ─── Schema ───────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "KITCHEN", label: "Kitchen" },
  { value: "DISPATCH", label: "Dispatch" },
  { value: "DRIVER", label: "Driver" },
];

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "KITCHEN", "DISPATCH", "DRIVER"] as const),
});

const editSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  password: z
    .string()
    .refine((v) => v === "" || v.length >= 8, {
      message: "Password must be at least 8 characters",
    })
    .optional(),
  role: z.enum(["ADMIN", "KITCHEN", "DISPATCH", "DRIVER"] as const).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserFormValues = z.infer<typeof createSchema>;
export type EditUserFormValues = z.infer<typeof editSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateUserFormProps {
  mode: "create";
  onSubmit: (values: CreateUserFormValues) => Promise<void>;
  onCancel: () => void;
  serverError?: string | null;
}

interface EditUserFormProps {
  mode: "edit";
  defaultValues: Pick<User, "name" | "email" | "role" | "isActive">;
  onSubmit: (values: EditUserFormValues) => Promise<void>;
  onCancel: () => void;
  serverError?: string | null;
}

type UserFormProps = CreateUserFormProps | EditUserFormProps;

// ─── Component ────────────────────────────────────────────────────────────────

export function UserForm(props: UserFormProps) {
  const isEdit = props.mode === "edit";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues | EditUserFormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema) as never,
    defaultValues:
      isEdit
        ? {
            name: (props as EditUserFormProps).defaultValues.name,
            email: (props as EditUserFormProps).defaultValues.email,
            password: "",
            role: (props as EditUserFormProps).defaultValues.role,
            isActive: (props as EditUserFormProps).defaultValues.isActive,
          }
        : {
            name: "",
            email: "",
            password: "",
            role: "KITCHEN" as UserRole,
          },
  });

  return (
    <form
      onSubmit={handleSubmit(props.onSubmit as never)}
      noValidate
      className="space-y-4"
    >
      {props.serverError && (
        <div
          role="alert"
          className="rounded-xl border border-[#ffdada] bg-[#fff5f5] px-4 py-3 text-xs text-[#a34747]"
        >
          {props.serverError}
        </div>
      )}

      <Input
        label="Full name"
        id="user-name"
        type="text"
        placeholder="Jane Cook"
        error={errors.name?.message}
        {...register("name")}
      />

      <Input
        label="Email address"
        id="user-email"
        type="email"
        placeholder="jane@fernleaf.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label={isEdit ? "New password (leave blank to keep current)" : "Password"}
        id="user-password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        hint={isEdit ? "Minimum 8 characters" : undefined}
        {...register("password")}
      />

      <Select
        label="Staff Role"
        id="user-role"
        options={ROLE_OPTIONS}
        placeholder="Select a role"
        error={errors.role?.message}
        {...register("role")}
      />

      {isEdit && (
        <div className="flex items-center gap-3 rounded-xl border border-[#d9d2c2] bg-[#f5f1e6]/60 px-4 py-3">
          <input
            id="user-is-active"
            type="checkbox"
            className="h-4 w-4 rounded-md border-[#d9d2c2] accent-[#294d33] cursor-pointer"
            {...register("isActive")}
          />
          <label htmlFor="user-is-active" className="text-xs font-semibold text-[#26352a] cursor-pointer">
            Account active and allowed to sign in
          </label>
        </div>
      )}

      <div className="flex justify-end gap-2.5 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={props.onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? "Save changes" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
