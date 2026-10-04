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
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <PageHeader
          title="Staff Users"
          description="Manage kitchen personnel, drivers, dispatch, and system administrators."
          actions={
            <Button
              id="create-user-btn"
              icon={<Plus size={16} />}
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
            >
              Create Staff User
            </Button>
          }
        />

        {/* Table card */}
        <div className="rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6]/90 backdrop-blur-md shadow-[0_10px_35px_rgba(38,53,42,0.04)] overflow-hidden">
          {isError && (
            <div className="px-6 py-4 text-sm text-[#a34747] bg-[#fff5f5] border-b border-[#ffdada]">
              {getErrorMessage(error, "Failed to load users. Please try again.")}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Staff users">
              <thead>
                <tr className="border-b border-[#eae5d8] bg-[#f5f1e6]/70">
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#5c685e] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9dc]">
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
                      className="hover:bg-[#f6f2e8] transition-colors cursor-pointer group"
                      onClick={() => router.push(`/dashboard/users/${user.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-[#26352a]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#294d33]/10 text-[#294d33] font-serif text-xs font-bold border border-[#294d33]/15">
                            {user.name.charAt(0)}
                          </div>
                          <span>{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#5c685e] font-mono text-xs">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={roleBadgeVariant(user.role)}>
                          {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.isActive ? "active" : "inactive"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td
                        className="px-6 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1.5">
                          <button
                            aria-label={`Edit ${user.name}`}
                            onClick={() => {
                              setEditError(null);
                              setEditUser(user);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#78857a] hover:border-[#d9d2c2] hover:bg-white hover:text-[#26352a] transition-all shadow-xs"
                          >
                            <Pencil size={14} />
                          </button>
                          {user.isActive && (
                            <button
                              aria-label={`Deactivate ${user.name}`}
                              onClick={() => setDeactivateUser(user)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#78857a] hover:border-[#ffdada] hover:bg-[#fff5f5] hover:text-[#a34747] transition-all shadow-xs"
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
