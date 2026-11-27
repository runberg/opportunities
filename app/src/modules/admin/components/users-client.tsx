"use client"

import { Panel } from "@/shared/components/ui/panel"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { formatDate, formatDateTime } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Dialog } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Select } from "@/shared/components/ui/select"
import { UserPlus, Pencil, KeyRound } from "lucide-react"
import { SortableHeader, sortRows, type SortDir } from "@/shared/components/ui/sortable-header"

type SectionAccess = "FULL" | "READ_ONLY" | "NONE"

interface User {
  id: string
  email: string
  role: string
  active: boolean
  createdAt: Date | string
  lastLoginAt: Date | string | null
  passwordChangedAt: Date | string | null
  temporaryPasswordExpiresAt: Date | string | null
  recoveryAdmin: boolean
  opportunitiesAccess: SectionAccess
  adhocAccess: SectionAccess
  inventoryAccess: SectionAccess
  clientsAccess: SectionAccess
}

const NEW_USER = {
  email: "",
  role: "USER",
  opportunitiesAccess: "FULL" as SectionAccess,
  adhocAccess: "FULL" as SectionAccess,
  inventoryAccess: "FULL" as SectionAccess,
  clientsAccess: "NONE" as SectionAccess,
}

function PasswordSetupStatus({ user }: { readonly user: User }) {
  if (user.temporaryPasswordExpiresAt) {
    return <span className="text-amber-700">
      Awaiting password change
      {new Date(user.temporaryPasswordExpiresAt).getTime() <= Date.now() && " (expired)"}
    </span>
  }
  if (user.passwordChangedAt) return <>Changed {formatDate(user.passwordChangedAt)}</>
  return <span className="text-gray-500">Unknown</span>
}

function CredentialDeliveryOptions({
  manual,
  onChange,
}: {
  readonly manual: boolean
  readonly onChange: (value: boolean) => void
}) {
  return (
    <details className="text-sm text-gray-300">
      <summary className="cursor-pointer">More options{manual && " · Manual handoff selected"}</summary>
      <label className="mt-2 flex items-center gap-2">
        <input type="checkbox" checked={manual} onChange={(event) => onChange(event.target.checked)} />
        Hand off the temporary password manually
      </label>
      <p className="mt-1 text-xs text-gray-400">Use this if email is unavailable. The portal shows the password once.</p>
    </details>
  )
}

const ACCESS_LABELS: Record<SectionAccess, string> = {
  FULL: "Full",
  READ_ONLY: "Read only",
  NONE: "No access",
}

function AccessBadge({ level, fullLabel = "Full" }: { readonly level: SectionAccess; readonly fullLabel?: string }) {
  const colours: Record<SectionAccess, string> = {
    FULL: "bg-green-100 text-green-700",
    READ_ONLY: "bg-yellow-100 text-yellow-700",
    NONE: "bg-red-100 text-red-700",
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colours[level]}`}>
      {level === "FULL" ? fullLabel : ACCESS_LABELS[level]}
    </span>
  )
}

function AccessSelect({
  id,
  value,
  onChange,
  writeLabel = "Full access",
}: {
  readonly writeLabel?: string
  readonly id: string
  readonly value: SectionAccess
  readonly onChange: (v: SectionAccess) => void
}) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value as SectionAccess)}>
      <option value="FULL">{writeLabel}</option>
      <option value="READ_ONLY">Read only</option>
      <option value="NONE">No access</option>
    </Select>
  )
}

export function AdminUsersClient({
  users,
  currentUserId,
}: {
  readonly users: User[]
  readonly currentUserId: string
}) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [manual, setManual] = useState(false)
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [sortKey, setSortKey] = useState("email")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  function handleSort(key: string, dir: SortDir) { setSortKey(key); setSortDir(dir) }
  const sorted = useMemo(() => sortRows(users, sortKey, sortDir), [users, sortKey, sortDir])

  const [newUser, setNewUser] = useState(NEW_USER)
  const [editForm, setEditForm] = useState({
    email: "",
    role: "USER",
    active: true,
    opportunitiesAccess: "FULL" as SectionAccess,
    adhocAccess: "FULL" as SectionAccess,
    inventoryAccess: "FULL" as SectionAccess,
    clientsAccess: "NONE" as SectionAccess,
  })

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (newUser.role !== "ADMIN" && newUser.opportunitiesAccess === "NONE" && newUser.adhocAccess === "NONE" && newUser.inventoryAccess === "NONE" && newUser.clientsAccess === "NONE") {
      setError("A user must have access to at least one section.")
      return
    }

    if (await issuePassword("/api/admin/users", newUser.email, "Welcome email queued.", newUser)) {
      setShowCreate(false)
      setNewUser(NEW_USER)
    }
  }

  async function issuePassword(path: string, email: string, message: string, account = {}) {
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...account, delivery: manual ? "manual" : "email" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Could not issue a temporary password.")
        return false
      }
      if (data.temporaryPassword) setIssued({ email, password: data.temporaryPassword })
      else setNotice(message)
      router.refresh()
      return true
    } catch {
      setError("Could not reach the portal. Check the user list before retrying.")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!resetUser) return
    const succeeded = await issuePassword(
      `/api/admin/users/${resetUser.id}/reset-password`, resetUser.email, "Password reset email queued.",
    )
    if (succeeded) setResetUser(null)
  }

  function openEdit(user: User) {
    setEditUser(user)
    setEditForm({
      email: user.email,
      role: user.role,
      active: user.active,
      opportunitiesAccess: user.opportunitiesAccess,
      adhocAccess: user.adhocAccess,
      inventoryAccess: user.inventoryAccess,
      clientsAccess: user.clientsAccess,
    })
    setError("")
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editUser) return
    setError("")

    if (editForm.role !== "ADMIN" && editForm.opportunitiesAccess === "NONE" && editForm.adhocAccess === "NONE" && editForm.inventoryAccess === "NONE" && editForm.clientsAccess === "NONE") {
      setError("A user must have access to at least one section.")
      return
    }

    setSaving(true)

    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Failed to update user.")
      return
    }

    setEditUser(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setManual(false); setError(""); setShowCreate(true) }}>
          <UserPlus size={16} className="mr-1.5" />
          Add User
        </Button>
      </div>

      {notice && <p role="status" className="mb-3 text-sm text-green-700">{notice}</p>}
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortableHeader label="Email" sortKey="email" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Role" sortKey="role" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Status" sortKey="active" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Section access</th>
              <SortableHeader label="Last sign-in" sortKey="lastLoginAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left font-medium text-gray-600">Password setup</th>
              <SortableHeader label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((user) => (
              <tr key={user.id} className={user.id === currentUserId ? "bg-blue-50/40" : "hover:bg-gray-50"}>
                <td className="px-4 py-3 font-medium text-gray-900">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${user.role === "ADMIN" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="grid grid-cols-[auto_auto] gap-x-2 gap-y-1 text-xs items-center w-fit">
                    <span>Opportunities</span><AccessBadge level={user.opportunitiesAccess} />
                    <span>Ad Hoc</span><AccessBadge level={user.adhocAccess} />
                    <span>Inventory</span><AccessBadge level={user.inventoryAccess} />
                    <span>Clients</span><AccessBadge level={user.clientsAccess} fullLabel="Write" />
                  </div>
                </td>
                <td className="px-4 py-3">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "No sign-in recorded"}</td>
                <td className="px-4 py-3"><PasswordSetupStatus user={user} /></td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    aria-label={`Edit ${user.email}`}
                    title="Edit user"
                    onClick={() => openEdit(user)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  {!user.recoveryAdmin && user.id !== currentUserId && (
                    <button
                      type="button"
                      aria-label={`Reset password for ${user.email}`}
                      title="Reset password"
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                      onClick={() => { setManual(false); setError(""); setResetUser(user) }}
                    >
                      <KeyRound size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Create user dialog */}
      <Dialog open={showCreate} onClose={() => { if (!saving) setShowCreate(false) }} title="Add User">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="create-email">Email (username) *</Label>
            <Input
              id="create-email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              placeholder="user@company.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="create-role">Role</Label>
            <Select
              id="create-role"
              value={newUser.role}
              onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          {newUser.role !== "ADMIN" && (
            <>
              <div>
                <Label htmlFor="create-opportunities-access">Opportunities Access</Label>
                <AccessSelect
                  id="create-opportunities-access"
                  value={newUser.opportunitiesAccess}
                  onChange={(v) => setNewUser((p) => ({ ...p, opportunitiesAccess: v }))}
                />
              </div>
              <div>
                <Label htmlFor="create-adhoc-access">Ad Hoc Access</Label>
                <AccessSelect
                  id="create-adhoc-access"
                  value={newUser.adhocAccess}
                  onChange={(v) => setNewUser((p) => ({ ...p, adhocAccess: v }))}
                />
              </div>
              <div>
                <Label htmlFor="create-inventory-access">Inventory Access</Label>
                <AccessSelect
                  id="create-inventory-access"
                  value={newUser.inventoryAccess}
                  onChange={(v) => setNewUser((p) => ({ ...p, inventoryAccess: v }))}
                />
              </div>
              <div>
                <Label htmlFor="create-clients-access">Clients Access</Label>
                <AccessSelect id="create-clients-access" value={newUser.clientsAccess}
                  onChange={(v) => setNewUser((p) => ({ ...p, clientsAccess: v }))} writeLabel="Write access" />
              </div>
            </>
          )}
          <CredentialDeliveryOptions manual={manual} onChange={setManual} />
          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : manual ? "Create manually" : "Create and send welcome email"}</Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!resetUser} onClose={() => { if (!saving) setResetUser(null) }} title="Reset password">
        <form onSubmit={handleReset} className="space-y-4">
          <p className="text-sm text-gray-300">
            Issue a temporary password for <strong>{resetUser?.email}</strong>? This signs the user out and replaces their current password.
          </p>
          <CredentialDeliveryOptions manual={manual} onChange={setManual} />
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Resetting…" : manual ? "Reset manually" : "Reset and send email"}</Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setResetUser(null)}>Cancel</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!issued} onClose={() => setIssued(null)} title="Temporary password">
        <div className="space-y-4 text-sm text-gray-300">
          <p>Share this password with <strong>{issued?.email}</strong> through a trusted channel. It expires in 48 hours and is shown here once.</p>
          <Input aria-label="Temporary password" className="font-mono" readOnly value={issued?.password ?? ""} onFocus={(event) => event.currentTarget.select()} />
          <Button type="button" onClick={() => setIssued(null)}>Done</Button>
        </div>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onClose={() => { setEditUser(null); setError("") }} title={`Edit — ${editUser?.email}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <Label htmlFor="edit-email">Email (username) *</Label>
            <Input
              id="edit-email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-role">Role</Label>
            <Select id="edit-role" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-active">Account Status</Label>
            <Select id="edit-active" value={editForm.active ? "true" : "false"} onChange={(e) => setEditForm((p) => ({ ...p, active: e.target.value === "true" }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          {editForm.role !== "ADMIN" && (
            <>
              <div>
                <Label htmlFor="edit-opportunities-access">Opportunities Access</Label>
                <AccessSelect
                  id="edit-opportunities-access"
                  value={editForm.opportunitiesAccess}
                  onChange={(v) => setEditForm((p) => ({ ...p, opportunitiesAccess: v }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-adhoc-access">Ad Hoc Access</Label>
                <AccessSelect
                  id="edit-adhoc-access"
                  value={editForm.adhocAccess}
                  onChange={(v) => setEditForm((p) => ({ ...p, adhocAccess: v }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-inventory-access">Inventory Access</Label>
                <AccessSelect
                  id="edit-inventory-access"
                  value={editForm.inventoryAccess}
                  onChange={(v) => setEditForm((p) => ({ ...p, inventoryAccess: v }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-clients-access">Clients Access</Label>
                <AccessSelect id="edit-clients-access" value={editForm.clientsAccess}
                  onChange={(v) => setEditForm((p) => ({ ...p, clientsAccess: v }))} writeLabel="Write access" />
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setEditUser(null); setError("") }}>Cancel</Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
