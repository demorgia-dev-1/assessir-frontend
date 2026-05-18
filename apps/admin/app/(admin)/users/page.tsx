"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchUsers,
  fetchUserById,
  createUser,
  clearError,
  clearSelectedUser,
  User
} from "@/store/slices/users-slice";
import { toast } from "react-toastify";
import { FiEye, FiUserPlus, FiX, FiMail, FiUser, FiLock, FiCheck } from "react-icons/fi";

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const {
    users,
    loading,
    creating,
    viewLoading,
    selectedUser,
    error,
    currentPage,
    totalPages,
    totalUsers,
    hasNext,
    hasPrev
  } = useAppSelector((state) => state.users);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("candidate");

  // Side Panel state controls
  const [panelMode, setPanelMode] = useState<"create" | "view">("create");

  useEffect(() => {
    dispatch(fetchUsers({ page: 1, limit: 10 }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handlePageChange = (page: number) => {
    dispatch(fetchUsers({ page, limit: 10 }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      role
    };

    const resultAction = await dispatch(createUser(payload));
    if (createUser.fulfilled.match(resultAction)) {
      toast.success(`User "${payload.name}" successfully registered!`);
      // Reset form states
      setName("");
      setEmail("");
      setPassword("");
      setRole("candidate");
    }
  };

  const handleViewUser = (id: string | number) => {
    setPanelMode("view");
    dispatch(fetchUserById(id));
  };

  const handleCloseViewMode = () => {
    setPanelMode("create");
    dispatch(clearSelectedUser());
  };

  // Compute dynamic counts based on currently loaded users (or custom stats breakdown)
  const adminCount = users.filter(u => u.role === "admin").length;
  const assessorCount = users.filter(u => u.role === "assessor").length;
  const candidateCount = users.filter(u => u.role === "candidate").length;

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      {/* Header section */}
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-8 shadow-soft shadow-slate-900/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Administrative Control
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              User Management
            </h1>
           
          </div>
          <div className="text-left md:text-right">
            <p className="text-3xl font-bold text-slate-950">{totalUsers}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Total Registered Users</p>
          </div>
        </div>
      </header>

     

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Table Section */}
        <div className="glass-panel flex flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">User Details</th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Joined Date</th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-5"><div className="h-4 w-8 rounded bg-slate-100" /></td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-32 rounded bg-slate-100" />
                        <div className="h-3 w-40 mt-1 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5"><div className="h-6 w-20 rounded-full bg-slate-100" /></td>
                      <td className="px-6 py-5"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                      <td className="px-6 py-5"><div className="h-4 w-12 ml-auto rounded bg-slate-100" /></td>
                    </tr>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="group transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-5 text-sm font-medium text-slate-400">#{user.id}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                          <span className="text-xs text-slate-500 mt-0.5">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {user.role === "admin" && (
                          <span className="inline-flex rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                            Admin
                          </span>
                        )}
                        {user.role === "assessor" && (
                          <span className="inline-flex rounded-full bg-sky-50 text-sky-700 border border-sky-100 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                            Assessor
                          </span>
                        )}
                      
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : "N/A"}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                          title="View User Details"
                        >
                          <FiEye className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-sm text-slate-500">
                      No system users registered. Register a new user to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50/20 px-6 py-5">
            <div className="flex flex-col">
              <p className="text-sm text-slate-500">
                Page <span className="font-semibold text-slate-950">{currentPage}</span> of <span className="font-semibold text-slate-950">{totalPages}</span>
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Total {totalUsers} records</p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={!hasPrev || loading}
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Previous
              </button>
              <button
                disabled={!hasNext || loading}
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel Workspace */}
        <div className="flex flex-col gap-6">
          {panelMode === "create" && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
                  <FiUserPlus className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">Create New User</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">Define administrative operators, assessors, or candidate access details.</p>
              
              <form onSubmit={handleCreateUser} className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <FiUser className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                      required
                      disabled={creating}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <FiMail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. jane@assessir.com"
                      className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                      required
                      disabled={creating}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Secure Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <FiLock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                      required
                      disabled={creating}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Access Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 appearance-none"
                    disabled={creating}
                  >
                 <option>Select a role</option> 
                    <option value="assessor">Assessor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creating || !name.trim() || !email.trim() || !password.trim()}
                  className="mt-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                >
                  {creating ? "Creating..." : "Register User"}
                </button>
              </form>
            </div>
          )}

          {panelMode === "view" && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">User Details</h2>
                </div>
                <button onClick={handleCloseViewMode} className="text-slate-400 hover:text-slate-900 transition p-1 rounded-lg hover:bg-slate-100">
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">Account profiles and registered permissions details.</p>
              
              {viewLoading ? (
                <div className="mt-8 space-y-4 animate-pulse">
                  <div className="h-14 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-16 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-16 bg-slate-100 rounded-2xl w-full" />
                </div>
              ) : selectedUser ? (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Account ID</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">#{selectedUser.id}</p>
                  </div>
                  
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{selectedUser.name}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{selectedUser.email}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Access Role</p>
                    <div className="mt-1">
                      {selectedUser.role === "admin" && (
                        <span className="inline-flex rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                          Admin
                        </span>
                      )}
                      {selectedUser.role === "assessor" && (
                        <span className="inline-flex rounded-full bg-sky-50 text-sky-700 border border-sky-100 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                          Assessor
                        </span>
                      )}
                     
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                      <p className="mt-0.5 text-xs text-slate-700">Account Lifecycle</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
                      <FiCheck className="h-3 w-3" /> Active Access
                    </span>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Registration Date</p>
                    <p className="mt-1 text-xs text-slate-700">
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      }) : "N/A"}
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleCloseViewMode}
                    className="w-full mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Close Details
                  </button>
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-500 text-center">Unable to load profiles.</p>
              )}
            </div>
          )}

          <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Operational Policy</h3>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Role configuration dictates permissions boundaries. Always ensure operator verification prior to designating Admin credentials.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
