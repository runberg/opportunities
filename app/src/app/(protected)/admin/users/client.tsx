"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Dialog } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Select } from "@/shared/components/ui/select"
import { UserPlus, Pencil } from "lucide-react"
import { SortableHeader, sortRows, type SortDir } from "@/shared/components/ui/sortable-header"

interface User {
  id: string
  email: string
  role: string
  active: boolean
  createdAt: Date | string
}

export function AdminUsersClient({
  users,
  currentUserId,
}: {
  users: User[]
  currentUserId: string
}) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [sortKey, setSortKey] = useState("email")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  function handleSort(key: string, dir: SortDir) { setSortKey(key); setSortDir(dir) }
  const sorted = useMemo(() => sortRows(users, sortKey, sortDir), [users, sortKey, sortDir])

  const [newUser, setNewUser] = useState({ email: "", password: "", role: "USER" })
  const [editForm, setEditForm] = useState({ email: "", role: "USER", active: true, newPassword: "" })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Failed to create user.")
      return
    }

    setShowCreate(false)
    setNewUser({ email: "", password: "", role: "USER" })
    router.refresh()
  }

  function openEdit(user: User) {
    setEditUser(user)
    setEditForm({ email: user.email, role: user.role, active: user.active, newPassword: "" })
    setError("")
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setError("")
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
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus size={16} className="mr-1.5" />
          Add User
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortableHeader label="Email" sortKey="email" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Role" sortKey="role" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Status" sortKey="active" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
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
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(user)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user dialog */}
      <Dialog open={showCreate} onClose={() => { setShowCreate(false); setError("") }} title="Add User">
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
            <Label htmlFor="create-password">Initial Password *</Label>
            <Input
              id="create-password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
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
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create User"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setError("") }}>Cancel</Button>
          </div>
        </form>
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
          <div>
            <Label htmlFor="edit-password">
              New Password <span className="font-normal text-gray-400">(leave blank to keep current)</span>
            </Label>
            <Input
              id="edit-password"
              type="password"
              value={editForm.newPassword}
              onChange={(e) => setEditForm((p) => ({ ...p, newPassword: e.target.value }))}
              minLength={8}
              placeholder="Minimum 8 characters"
            />
          </div>
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
