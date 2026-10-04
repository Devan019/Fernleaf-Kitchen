"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { UserForm, type EditUserFormValues } from "@/features/users/UserForm";
import { useUser, useUpdateUser, useDeactivateUser } from "@/features/users/useUsers";
import { getErrorMessage } from "@/lib/utils/errors";
import type { UserRole } from "@/types";
import { ArrowLeft, Pencil, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

function roleBadgeVariant(role: UserRole) {
  const map: Record<UserRole, "admin" | "kitchen" | "dispatch" | "driver"> = {
    ADMIN: "admin",
    KITCHEN: "kitchen",
    DISPATCH: "dispatch",
    DRIVER: "driver",
  };
  return map[role];
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f4f0e6]/60 border border-[#eae5d8] p-4">
      <dt className="text-[10px] font-bold text-[#78857a] uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-sm font-medium text-[#26352a]">{value}</dd>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: user, isLoading, isError, error } = useUser(id);

  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const updateMutation = useUpdateUser(id);
  const deactivateMutation = useDeactivateUser();

  const handleEdit = async (values: EditUserFormValues) => {
    setEditError(null);
    try {
      const payload = { ...values };
      if (!payload.password) delete payload.password;
      if (!payload.email) delete payload.email;
      await updateMutation.mutateAsync(payload);
      setEditOpen(false);
    } catch (err) {
      setEditError(getErrorMessage(err));
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateMutation.mutateAsync(id);
      setDeactivateOpen(false);
      router.push("/dashboard/users");
    } catch {
      // Keep dialog open
    }
  };

  const title = isLoading ? "User" : user?.name ?? "User not found";

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <Header title={title} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Back link */}
        <Link
          href="/dashboard/users"
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-[#5c685e] hover:text-[#26352a] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Staff Users
        </Link>

        {isLoading && (
          <div className="mt-4 space-y-4">
            <CardSkeleton />
          </div>
        )}

        {isError && (
          <div className="mt-4 rounded-2xl border border-[#ffdada] bg-[#fff5f5] p-5 text-sm text-[#a34747]">
            {getErrorMessage(error, "Failed to load user.")}
          </div>
        )}

        {user && (
          <div className="mt-4 space-y-6">
            {/* Main card */}
            <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md p-8 shadow-[0_10px_35px_rgba(38,53,42,0.04)]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#eae5d8] mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#294d33] font-serif text-xl font-bold text-[#d8bd83] shadow-md border border-white/10">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-[#26352a]">
                      {user.name}
                    </h2>
                    <p className="text-sm font-mono text-[#5c685e] mt-0.5">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Pencil size={13} />}
                    onClick={() => {
                      setEditError(null);
                      setEditOpen(true);
                    }}
                  >
                    Edit User
                  </Button>
                  {user.isActive && (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<UserMinus size={13} />}
                      onClick={() => setDeactivateOpen(true)}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Staff Role" value={
                  <Badge variant={roleBadgeVariant(user.role)}>
                    {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                  </Badge>
                } />
                <Field label="Account Status" value={
                  <Badge variant={user.isActive ? "active" : "inactive"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                } />
                <Field label="System ID" value={
                  <code className="font-mono text-xs text-[#4c594f] bg-[#ede8dc] px-2 py-0.5 rounded-lg border border-[#ded8c9]">
                    {user.id}
                  </code>
                } />
                <Field
                  label="Registered Date"
                  value={new Date(user.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
                <Field
                  label="Last Record Update"
                  value={new Date(user.updatedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
              </dl>
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Staff User"
        size="md"
      >
        {user && (
          <UserForm
            mode="edit"
            defaultValues={{
              name: user.name,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditOpen(false)}
            serverError={editError}
          />
        )}
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        loading={deactivateMutation.isPending}
        title="Deactivate User?"
        description={
          user
            ? `Are you sure you want to deactivate ${user.name}? Their account will be preserved but they will no longer be able to log in.`
            : ""
        }
        confirmLabel="Deactivate"
      />
    </ProtectedRoute>
  );
}
