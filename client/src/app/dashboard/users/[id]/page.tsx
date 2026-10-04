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
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value}</dd>
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
      <main className="flex-1 overflow-y-auto p-6">
        {/* Back link */}
        <Link
          href="/dashboard/users"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Users
        </Link>

        {isLoading && (
          <div className="mt-4 space-y-4">
            <CardSkeleton />
          </div>
        )}

        {isError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {getErrorMessage(error, "Failed to load user.")}
          </div>
        )}

        {user && (
          <div className="mt-4 space-y-5">
            {/* Main card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">
                    {user.name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Pencil size={13} />}
                    onClick={() => {
                      setEditError(null);
                      setEditOpen(true);
                    }}
                  >
                    Edit
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

              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <Field label="Role" value={
                  <Badge variant={roleBadgeVariant(user.role)}>
                    {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                  </Badge>
                } />
                <Field label="Status" value={
                  <Badge variant={user.isActive ? "active" : "inactive"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                } />
                <Field label="User ID" value={
                  <code className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {user.id}
                  </code>
                } />
                <Field
                  label="Created"
                  value={new Date(user.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
                <Field
                  label="Last updated"
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
        title="Edit User"
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
            ? `Are you sure you want to deactivate ${user.name}? They will no longer be able to log in.`
            : ""
        }
        confirmLabel="Deactivate"
      />
    </ProtectedRoute>
  );
}
