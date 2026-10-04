"use client";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { UserForm } from "@/features/users/UserForm";
import type {
  CreateUserFormValues,
  EditUserFormValues,
} from "@/features/users/UserForm";
import {
  useCreateUser,
  useDeactivateUser,
  useUpdateUser,
  useUsers,
} from "@/features/users/useUsers";
import { getErrorMessage } from "@/lib/utils/errors";
import type { User, UserRole } from "@/types";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  UserMinus,
  Users as UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ─── Role badge helper ────────────────────────────────────────────────────────

function roleBadgeVariant(role: UserRole) {
  const map: Record<UserRole, "admin" | "kitchen" | "dispatch" | "driver"> = {
    ADMIN: "admin",
    KITCHEN: "kitchen",
    DISPATCH: "dispatch",
    DRIVER: "driver",
  };
  return map[role];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();

  // Pagination state
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Data
  const { data, isLoading, isError, error } = useUsers({ page, limit: LIMIT });

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);

  // Server error for forms
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Mutations
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(editUser?.id ?? "");
  const deactivateMutation = useDeactivateUser();

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreate = async (values: CreateUserFormValues) => {
    setCreateError(null);
    try {
      await createMutation.mutateAsync(values);
      setCreateOpen(false);
    } catch (err) {
      setCreateError(getErrorMessage(err));
    }
  };

  const handleEdit = async (values: EditUserFormValues) => {
    setEditError(null);
    if (!editUser) return;
    try {
      // Strip blank password
      const payload = { ...values };
      if (!payload.password) delete payload.password;
      if (!payload.email) delete payload.email;
      await updateMutation.mutateAsync(payload);
      setEditUser(null);
    } catch (err) {
      setEditError(getErrorMessage(err));
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    try {
      await deactivateMutation.mutateAsync(deactivateUser.id);
      setDeactivateUser(null);
    } catch {
      // error shown via toast or inline — keep dialog open
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <Header title="Users" />
      <main className="flex-1 overflow-y-auto p-6">
        <PageHeader
          title="Staff Users"
          description="Manage staff accounts across all roles."
          actions={
            <Button
              id="create-user-btn"
              icon={<Plus size={15} />}
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
            >
              Create User
            </Button>
          }
        />

        {/* Table card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {isError && (
            <div className="px-6 py-4 text-sm text-red-600">
              {getErrorMessage(error, "Failed to load users. Please try again.")}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Staff users">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <TableSkeleton rows={5} cols={5} />
                ) : !data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={<UsersIcon size={24} />}
                        title="No users yet"
                        description="Create your first staff account to get started."
                        action={
                          <Button
                            icon={<Plus size={15} />}
                            onClick={() => setCreateOpen(true)}
                          >
                            Create User
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  data.data.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/users/${user.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={roleBadgeVariant(user.role)}>
                          {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.isActive ? "active" : "inactive"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1">
                          <button
                            aria-label={`Edit ${user.name}`}
                            onClick={() => {
                              setEditError(null);
                              setEditUser(user);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {user.isActive && (
                            <button
                              aria-label={`Deactivate ${user.name}`}
                              onClick={() => setDeactivateUser(user)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.meta.totalPages > 1 && (
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              hasNextPage={data.meta.hasNextPage}
              hasPreviousPage={data.meta.hasPreviousPage}
              total={data.meta.total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      </main>

      {/* Create User Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Staff User"
        size="md"
      >
        <UserForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          serverError={createError}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        title="Edit Staff User"
        size="md"
      >
        {editUser && (
          <UserForm
            mode="edit"
            defaultValues={{
              name: editUser.name,
              email: editUser.email,
              role: editUser.role,
              isActive: editUser.isActive,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditUser(null)}
            serverError={editError}
          />
        )}
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={deactivateUser !== null}
        onClose={() => setDeactivateUser(null)}
        onConfirm={handleDeactivate}
        loading={deactivateMutation.isPending}
        title="Deactivate User?"
        description={
          deactivateUser
            ? `Are you sure you want to deactivate ${deactivateUser.name}? Their account will be preserved but they will no longer be able to log in.`
            : ""
        }
        confirmLabel="Deactivate"
      />
    </ProtectedRoute>
  );
}
