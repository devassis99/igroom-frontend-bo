import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { Field, formInputClass } from "@/components/ui/FormField";
import { useAuthStore } from "@/auth/auth-store";
import {
  usersApi,
  rolesApi,
  type BoUser,
  type BoRole,
  type PermissionCatalogEntry,
} from "@/lib/users-api";

const modalCancelButtonClass =
  "rounded-[10px] border border-bo-input-border px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-ink-soft";
const modalSubmitButtonClass =
  "rounded-[10px] bg-bo-dark px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-on-dark disabled:cursor-not-allowed disabled:opacity-50";
const modalDangerButtonClass =
  "rounded-[10px] bg-bo-danger px-[18px] py-[11px] font-sans text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const tabButtonClass = (active: boolean) =>
  `rounded-[10px] px-3.5 py-2 font-sans text-xs font-semibold ${
    active ? "bg-bo-dark text-bo-on-dark" : "border border-bo-input-border bg-bo-surface text-bo-ink-soft"
  }`;
const smallSelectClass =
  "rounded-[8px] border border-bo-input-border bg-bo-surface px-2.5 py-1.5 font-sans text-xs font-medium text-bo-ink-soft outline-none disabled:cursor-not-allowed disabled:opacity-50";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Matches PlansPage's New Product / Add Price modal shell. Invites a
 * back-office user — creates a pre-provisioned bo_users row via
 * POST /users, exactly like auth.seed.ts does for the super admin. No
 * email is actually sent (no email infrastructure exists yet), so the
 * hint text below tells the admin to pass the Google account along
 * out-of-band.
 */
function InviteUserModal({
  open,
  onClose,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  roles: BoRole[];
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");

  const invite = useMutation({
    mutationFn: () => usersApi.invite({ email: email.trim(), name: name.trim(), roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      handleClose();
    },
  });

  function handleClose() {
    setEmail("");
    setName("");
    setRoleId(roles[0]?.id ?? "");
    invite.reset();
    onClose();
  }

  const canSubmit =
    email.trim().length > 0 && name.trim().length > 0 && roleId.length > 0 && !invite.isPending;

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Invite User</h1>
        <button type="button" onClick={handleClose} aria-label="Close" className="font-sans text-xl text-bo-muted-5">
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs text-bo-muted-5">
        They'll sign in with this exact Google account and be walked through mandatory two-factor
        setup on first login — the same flow the super admin went through.
      </p>

      <Field label="NAME">
        <input
          type="text"
          placeholder="e.g. Jordan Lee"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={formInputClass}
        />
      </Field>

      <Field label="EMAIL (GOOGLE ACCOUNT)">
        <input
          type="email"
          placeholder="jordan.lee@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={formInputClass}
        />
      </Field>

      <Field label="ROLE">
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={formInputClass}>
          {roles.length === 0 && <option value="">No roles yet — create one first</option>}
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-1.5 rounded-[10px] bg-bo-table-head p-3.5">
        <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">HEADS UP</span>
        <span className="font-sans text-xs leading-relaxed text-bo-muted-4">
          No email is sent automatically — tell them directly to sign in at the back office login
          page with this exact Google account.
        </span>
      </div>

      {invite.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">{errorMessage(invite.error, "Failed to invite user.")}</p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button type="button" onClick={() => invite.mutate()} disabled={!canSubmit} className={modalSubmitButtonClass}>
          {invite.isPending ? "Inviting…" : "Send Invite"}
        </button>
      </div>
    </Modal>
  );
}

interface DeactivateTarget {
  userId: string;
  name: string;
  nextIsActive: boolean;
}

/** Small in-app confirm — reused for both deactivating and reactivating. */
function ToggleActiveModal({
  target,
  onClose,
  onDone,
}: {
  target: DeactivateTarget | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => {
      if (!target) throw new Error("No user selected.");
      return usersApi.setActive(target.userId, target.nextIsActive);
    },
    onSuccess: () => {
      onDone();
    },
  });

  const verb = target?.nextIsActive ? "Reactivate" : "Deactivate";

  function handleClose() {
    mutation.reset();
    onClose();
  }

  return (
    <Modal open={target !== null} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">
          {verb} {target?.name}?
        </h1>
        <button type="button" onClick={handleClose} aria-label="Close" className="font-sans text-xl text-bo-muted-5">
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs leading-relaxed text-bo-muted-5">
        {target?.nextIsActive
          ? "They'll be able to sign in again immediately."
          : "They'll be signed out and blocked from signing back in — including via any API call — until reactivated."}
      </p>

      {mutation.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">
          {errorMessage(mutation.error, "Failed to update this user.")}
        </p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={target?.nextIsActive ? modalSubmitButtonClass : modalDangerButtonClass}
        >
          {mutation.isPending ? "Saving…" : verb}
        </button>
      </div>
    </Modal>
  );
}

function UsersTab({
  users,
  roles,
  isLoading,
  isError,
  error,
  canManage,
}: {
  users: BoUser[];
  roles: BoRole[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<DeactivateTarget | null>(null);

  const updateRole = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      usersApi.updateRole(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  function closeToggleModal() {
    setToggleTarget(null);
  }

  function onToggleDone() {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    setToggleTarget(null);
  }

  return (
    <div>
      <div className="mb-3.5 flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="m-0 font-sans text-[15px] font-semibold text-bo-ink">Back-Office Users</p>
          <p className="m-0 font-sans text-xs text-bo-muted-5">
            Invite teammates and control what they can see and do in this app.
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setInviteOpen(true)} className={tabButtonClass(false)}>
            + Invite User
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="grid grid-cols-[1.2fr_1.4fr_1.1fr_1fr_0.9fr_1.1fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>NAME</span>
          <span>EMAIL</span>
          <span>ROLE</span>
          <span>STATUS</span>
          <span>LAST LOGIN</span>
          <span />
        </div>
        {isLoading ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">Loading users…</p>
        ) : isError ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-danger">
            Couldn't load users: {errorMessage(error, "unknown error")}
          </p>
        ) : users.length === 0 ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">No back-office users yet.</p>
        ) : (
          users.map((user, i) => {
            const isSelf = user.id === currentUserId;
            return (
              <div
                key={user.id}
                className={`grid grid-cols-[1.2fr_1.4fr_1.1fr_1fr_0.9fr_1.1fr] items-center px-5 py-2.5 ${
                  i > 0 ? "border-t border-bo-border-soft" : ""
                }`}
              >
                <span className="font-sans text-[13px] font-semibold text-bo-ink">
                  {user.name}
                  {isSelf && <span className="ml-1.5 font-sans text-[10px] font-medium text-bo-muted-5">(you)</span>}
                </span>
                <span className="truncate font-sans text-xs font-medium text-bo-muted-2">{user.email}</span>
                {canManage ? (
                  <select
                    value={user.roleId}
                    disabled={isSelf || updateRole.isPending}
                    onChange={(e) => updateRole.mutate({ userId: user.id, roleId: e.target.value })}
                    className={smallSelectClass}
                    title={isSelf ? "You can't change your own role" : undefined}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-sans text-xs font-medium text-bo-muted-2">{user.roleName}</span>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <StatusPill tone={user.isActive ? "success" : "danger"}>
                    {user.isActive ? "Active" : "Deactivated"}
                  </StatusPill>
                  {!user.claimed && <StatusPill tone="gold">Pending Invite</StatusPill>}
                </div>
                <span className="font-sans text-xs font-medium text-bo-muted-2">{formatDate(user.lastLoginAt)}</span>
                <div className="flex justify-end">
                  {canManage && !isSelf && (
                    <button
                      type="button"
                      onClick={() =>
                        setToggleTarget({ userId: user.id, name: user.name, nextIsActive: !user.isActive })
                      }
                      className={`font-sans text-xs font-semibold ${
                        user.isActive ? "text-bo-danger" : "text-bo-ink-soft"
                      }`}
                    >
                      {user.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} roles={roles} />
      <ToggleActiveModal target={toggleTarget} onClose={closeToggleModal} onDone={onToggleDone} />
    </div>
  );
}

interface DeleteRoleTarget {
  roleId: string;
  name: string;
}

/**
 * Create-or-edit role form. Same component drives both "+ New Role" and
 * "Edit permissions" — editing skips the name/description fields (the
 * backend has no rename endpoint) and only PATCHes permissionKeys.
 */
function RoleFormModal({
  mode,
  role,
  open,
  onClose,
  permissionCatalog,
}: {
  mode: "create" | "edit";
  /** Required when mode === "edit". */
  role: BoRole | null;
  open: boolean;
  onClose: () => void;
  permissionCatalog: PermissionCatalogEntry[];
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Reset local form state whenever the modal is (re)opened for a
  // (possibly different) role — cheaper and simpler than syncing via
  // useEffect since this only needs to run at open time.
  const [lastOpenedFor, setLastOpenedFor] = useState<string | null>(null);
  const openKey = open ? (mode === "edit" ? (role?.id ?? "new") : "new") : null;
  if (open && openKey !== lastOpenedFor) {
    setLastOpenedFor(openKey);
    setName(mode === "edit" ? (role?.name ?? "") : "");
    setDescription(mode === "edit" ? (role?.description ?? "") : "");
    setSelectedKeys(mode === "edit" ? (role?.permissions ?? []) : []);
  }

  const save = useMutation({
    mutationFn: () => {
      if (mode === "create") {
        return rolesApi.create({ name: name.trim(), description: description.trim() || undefined, permissionKeys: selectedKeys });
      }
      if (!role) throw new Error("No role selected.");
      return rolesApi.updatePermissions(role.id, selectedKeys);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      handleClose();
    },
  });

  function handleClose() {
    save.reset();
    onClose();
  }

  function toggleKey(key: string) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const canSubmit = (mode === "edit" || name.trim().length > 0) && !save.isPending;

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">
          {mode === "create" ? "New Role" : `Edit "${role?.name}" permissions`}
        </h1>
        <button type="button" onClick={handleClose} aria-label="Close" className="font-sans text-xl text-bo-muted-5">
          ×
        </button>
      </div>

      {mode === "create" && (
        <>
          <Field label="ROLE NAME">
            <input
              type="text"
              placeholder="e.g. Support Agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={formInputClass}
            />
          </Field>
          <Field label="DESCRIPTION">
            <textarea
              placeholder="What this role is for"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${formInputClass} resize-none font-sans`}
            />
          </Field>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
          TABS & FUNCTIONALITY
        </span>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-[10px] border border-bo-input-border p-2.5">
          {permissionCatalog.map((permission) => (
            <label
              key={permission.key}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-bo-page/40"
            >
              <input
                type="checkbox"
                checked={selectedKeys.includes(permission.key)}
                onChange={() => toggleKey(permission.key)}
                className="mt-0.5"
              />
              <span className="flex flex-col">
                <span className="font-sans text-xs font-semibold text-bo-ink-soft">{permission.name}</span>
                {permission.description && (
                  <span className="font-sans text-[11px] text-bo-muted-5">{permission.description}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      {save.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">{errorMessage(save.error, "Failed to save role.")}</p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button type="button" onClick={() => save.mutate()} disabled={!canSubmit} className={modalSubmitButtonClass}>
          {save.isPending ? "Saving…" : mode === "create" ? "Create Role" : "Save Permissions"}
        </button>
      </div>
    </Modal>
  );
}

function DeleteRoleModal({
  target,
  onClose,
}: {
  target: DeleteRoleTarget | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      if (!target) throw new Error("No role selected.");
      return rolesApi.remove(target.roleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      handleClose();
    },
  });

  function handleClose() {
    mutation.reset();
    onClose();
  }

  return (
    <Modal open={target !== null} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Delete {target?.name}?</h1>
        <button type="button" onClick={handleClose} aria-label="Close" className="font-sans text-xl text-bo-muted-5">
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs leading-relaxed text-bo-muted-5">
        This can't be undone. Users still assigned to this role must be reassigned first.
      </p>

      {mutation.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">{errorMessage(mutation.error, "Failed to delete role.")}</p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={modalDangerButtonClass}
        >
          {mutation.isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

function RolesTab({
  roles,
  permissionCatalog,
  isLoading,
  isError,
  error,
  canManage,
}: {
  roles: BoRole[];
  permissionCatalog: PermissionCatalogEntry[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  canManage: boolean;
}) {
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BoRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteRoleTarget | null>(null);

  return (
    <div>
      <div className="mb-3.5 flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="m-0 font-sans text-[15px] font-semibold text-bo-ink">Roles</p>
          <p className="m-0 font-sans text-xs text-bo-muted-5">
            Each role controls which tabs and API actions its users get — enforced on both the
            frontend and the backend.
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setNewRoleOpen(true)} className={tabButtonClass(false)}>
            + New Role
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="grid grid-cols-[1fr_1.6fr_0.9fr_0.7fr_1.1fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>ROLE</span>
          <span>DESCRIPTION</span>
          <span>PERMISSIONS</span>
          <span>USERS</span>
          <span />
        </div>
        {isLoading ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">Loading roles…</p>
        ) : isError ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-danger">
            Couldn't load roles: {errorMessage(error, "unknown error")}
          </p>
        ) : roles.length === 0 ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">No roles yet.</p>
        ) : (
          roles.map((role, i) => (
            <div
              key={role.id}
              className={`grid grid-cols-[1fr_1.6fr_0.9fr_0.7fr_1.1fr] items-center px-5 py-2.5 ${
                i > 0 ? "border-t border-bo-border-soft" : ""
              }`}
            >
              <span className="font-sans text-[13px] font-semibold text-bo-ink">{role.name}</span>
              <span className="truncate font-sans text-xs font-medium text-bo-muted-2">
                {role.description || "—"}
              </span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{role.permissions.length}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{role.userCount}</span>
              <div className="flex items-center justify-end gap-2.5">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setEditTarget(role)}
                    className="font-sans text-xs font-semibold text-bo-gold"
                  >
                    Edit
                  </button>
                )}
                {canManage && role.name !== "superadmin" && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ roleId: role.id, name: role.name })}
                    className="font-sans text-xs font-semibold text-bo-danger"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <RoleFormModal
        mode="create"
        role={null}
        open={newRoleOpen}
        onClose={() => setNewRoleOpen(false)}
        permissionCatalog={permissionCatalog}
      />
      <RoleFormModal
        mode="edit"
        role={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        permissionCatalog={permissionCatalog}
      />
      <DeleteRoleModal target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}

/**
 * User Management tab: invite/manage back-office users, and define
 * roles + the tabs/API actions each one can reach. Split into two
 * sub-tabs in one page (Users, Roles & Permissions) rather than two
 * separate nav entries — they're two views onto the same RBAC model.
 *
 * Every mutation here is independently permission-gated server-side
 * (users.manage / roles.manage) — hiding a button here is a UX nicety,
 * not the enforcement. See users.routes.ts / roles.routes.ts.
 */
export function UsersPage() {
  const [tab, setTab] = useState<"users" | "roles">("users");
  const canManageUsers = useAuthStore((s) => s.hasPermission("users.manage"));
  const canManageRoles = useAuthStore((s) => s.hasPermission("roles.manage"));

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });
  const permissionsQuery = useQuery({
    queryKey: ["roles", "permissions"],
    queryFn: rolesApi.listPermissions,
  });

  const users = usersQuery.data?.users ?? [];
  const roles = useMemo(() => rolesQuery.data?.roles ?? [], [rolesQuery.data]);
  const permissionCatalog = permissionsQuery.data?.permissions ?? [];

  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">User Management</h1>

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setTab("users")} className={tabButtonClass(tab === "users")}>
          Users
        </button>
        <button type="button" onClick={() => setTab("roles")} className={tabButtonClass(tab === "roles")}>
          Roles & Permissions
        </button>
      </div>

      {tab === "users" ? (
        <UsersTab
          users={users}
          roles={roles}
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          error={usersQuery.error}
          canManage={canManageUsers}
        />
      ) : (
        <RolesTab
          roles={roles}
          permissionCatalog={permissionCatalog}
          isLoading={rolesQuery.isLoading}
          isError={rolesQuery.isError}
          error={rolesQuery.error}
          canManage={canManageRoles}
        />
      )}
    </div>
  );
}

export default UsersPage;
