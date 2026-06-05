"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchTeams,
  fetchTeamById,
  createTeam,
  updateTeam,
  clearError,
  clearSelectedTeam,
  Team,
} from "@/store/slices/teams-slice";
import { fetchUsers } from "@/store/slices/users-slice";
import { fetchSectors } from "@/store/slices/sectors-slice";
import { toast } from "react-toastify";
import {
  FiEye,
  FiUsers,
  FiX,
  FiCheckSquare,
  FiPlusSquare,
  FiBriefcase,
  FiLayers,
  FiEdit2,
} from "react-icons/fi";

export default function TeamsPage() {
  const dispatch = useAppDispatch();

  // Teams State
  const {
    teams,
    loading,
    creating,
    updating,
    viewLoading,
    selectedTeam,
    error: teamsError,
    currentPage,
    totalPages,
    totalTeams,
    hasNext,
    hasPrev,
  } = useAppSelector((state) => state.teams);

  // Users & Sectors States (for Selectors)
  const { users, loading: usersLoading } = useAppSelector(
    (state) => state.users
  );
  const { sectors, loading: sectorsLoading } = useAppSelector(
    (state) => state.sectors
  );

  // Form states
  const [teamName, setTeamName] = useState("");
  const [managerId, setManagerId] = useState<string | number>("");
  const [selectedSectorIds, setSelectedSectorIds] = useState<
    (string | number)[]
  >([]);

  // Side Panel state controls
  const [panelMode, setPanelMode] = useState<"create" | "view">("create");

  // Edit Team state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editManagerId, setEditManagerId] = useState<string | number>("");
  const [editSelectedSectorIds, setEditSelectedSectorIds] = useState<
    (string | number)[]
  >([]);

  useEffect(() => {
    dispatch(fetchTeams({ page: 1, limit: 10 }));
    // Fetch users and sectors with high limit to ensure complete options populate dropdowns
    dispatch(fetchUsers({ page: 1, limit: 100 }));
    dispatch(fetchSectors({ page: 1, limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (teamsError) {
      toast.error(teamsError);
      dispatch(clearError());
    }
  }, [teamsError, dispatch]);

  const handlePageChange = (page: number) => {
    dispatch(fetchTeams({ page, limit: 10 }));
  };

  const handleSectorToggle = (id: string | number) => {
    setSelectedSectorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error("Please provide a team name.");
      return;
    }
    if (!managerId) {
      toast.error("Please select a team manager.");
      return;
    }

    const payload = {
      name: teamName.trim(),
      manager_id: Number(managerId),
      sector_ids: selectedSectorIds.map((id) => Number(id)),
    };

    const resultAction = await dispatch(createTeam(payload));
    if (createTeam.fulfilled.match(resultAction)) {
      toast.success(`Team "${payload.name}" successfully registered!`);
      // Reset form states
      setTeamName("");
      setManagerId("");
      setSelectedSectorIds([]);
    }
  };

  const handleViewTeam = (id: string | number) => {
    setPanelMode("view");
    dispatch(fetchTeamById(id));
  };

  const handleCloseViewMode = () => {
    setPanelMode("create");
    dispatch(clearSelectedTeam());
  };

  // Edit Team handlers
  const handleEditTeamClick = (team: Team) => {
    setTeamToEdit(team);
    setEditTeamName(team.name);
    setEditManagerId(team.manager_id);
    setEditSelectedSectorIds(team.sector_ids || []);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setTeamToEdit(null);
    setEditTeamName("");
    setEditManagerId("");
    setEditSelectedSectorIds([]);
  };

  const handleSectorToggleEdit = (sectorId: string | number) => {
    setEditSelectedSectorIds((prev) =>
      prev.includes(sectorId)
        ? prev.filter((id) => id !== sectorId)
        : [...prev, sectorId]
    );
  };

  const handleUpdateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeamName.trim() || !editManagerId || !teamToEdit) {
      toast.error("Team name and manager are required.");
      return;
    }

    const payload = {
      id: teamToEdit.id,
      name: editTeamName.trim(),
      manager_id: Number(editManagerId),
      sector_ids: editSelectedSectorIds.map((id) => Number(id)),
    };

    const resultAction = await dispatch(updateTeam(payload));
    if (updateTeam.fulfilled.match(resultAction)) {
      toast.success(`Team "${payload.name}" updated successfully!`);
      handleCloseEditModal();
      // Refresh current page
      dispatch(fetchTeams({ page: currentPage, limit: 10 }));
    }
  };

  // Filter eligible managers (managers only)
  const eligibleManagers = users.filter((user) => user.role === "manager");

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      {/* Header section */}
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-8 shadow-soft shadow-slate-900/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Structural Management
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Teams & Operators
            </h1>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-950">{totalTeams}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Operational Teams
            </p>
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
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ID
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Team Details
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Manager
                  </th>
                  {/* <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Associated Sectors</th> */}
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Joined Date
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-5">
                        <div className="h-4 w-8 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-40 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-32 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <div className="h-5 w-16 rounded-full bg-slate-100" />
                          <div className="h-5 w-16 rounded-full bg-slate-100" />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-24 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-12 ml-auto rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : teams.length > 0 ? (
                  teams.map((team) => (
                    <tr
                      key={team.id}
                      className="group transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-slate-400">
                        {team.id}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-semibold text-slate-900">
                          {team.name}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {team.manager ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-950">
                              {team.manager.name}
                            </span>
                            <span className="text-xs text-slate-400 mt-0.5">
                              {team.manager.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold italic">
                            No Manager Designated
                          </span>
                        )}
                      </td>
                      {/* <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {team.sectors && team.sectors.length > 0 ? (
                            team.sectors.map((sector) => (
                              <span
                                key={sector.id}
                                className="inline-flex rounded-lg bg-slate-100 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                              >
                                {sector.name}
                              </span>
                            ))
                          ) : team.sector_ids && team.sector_ids.length > 0 ? (
                            team.sector_ids.map((sectorId) => {
                              const sector = sectors.find((s) => String(s.id) === String(sectorId));
                              return sector ? (
                                <span
                                  key={sector.id}
                                  className="inline-flex rounded-lg bg-slate-100 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                                >
                                  {sector.name}
                                </span>
                              ) : null;
                            })
                          ) : (
                            <span className="text-xs text-slate-400 italic">None</span>
                          )}
                        </div>
                      </td> */}
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {team.created_at
                          ? new Date(team.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "N/A"}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleViewTeam(team.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="View Team Details"
                          >
                            <FiEye className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleEditTeamClick(team)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Team"
                          >
                            <FiEdit2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-20 text-center text-sm text-slate-500"
                    >
                      No operational teams registered. Build your first team
                      structure to begin.
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
                Page{" "}
                <span className="font-semibold text-slate-950">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-950">
                  {totalPages}
                </span>
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">
                Total {totalTeams} records
              </p>
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
                  <FiPlusSquare className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Create New Team
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Link operational sectors, align access permissions, and select
                managers.
              </p>

              <form
                onSubmit={handleCreateTeam}
                className="mt-6 flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. OPERATIONS DELTA"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                    required
                    disabled={creating}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    Team Manager
                  </label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 appearance-none"
                    required
                    disabled={creating || usersLoading}
                  >
                    <option value="">Select manager...</option>
                    {eligibleManagers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    Associated Sectors
                  </label>
                  <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
                    {sectorsLoading ? (
                      <p className="text-xs text-slate-400 italic p-1">
                        Loading sectors...
                      </p>
                    ) : sectors.length > 0 ? (
                      sectors.map((sector) => (
                        <label
                          key={sector.id}
                          className="flex items-center gap-2.5 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSectorIds.includes(sector.id)}
                            onChange={() => handleSectorToggle(sector.id)}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-slate-905 focus:ring-slate-900"
                            disabled={creating}
                          />
                          <span className="text-xs text-slate-700 font-semibold">
                            {sector.name}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic p-1">
                        No sectors registered.
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating || !teamName.trim() || !managerId}
                  className="mt-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                >
                  {creating ? "Creating..." : "Register Team"}
                </button>
              </form>
            </div>
          )}

          {panelMode === "view" && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Team Details
                  </h2>
                </div>
                <button
                  onClick={handleCloseViewMode}
                  className="text-slate-400 hover:text-slate-900 transition p-1 rounded-lg hover:bg-slate-100"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Structural allocations and sector mappings.
              </p>

              {viewLoading ? (
                <div className="mt-8 space-y-4 animate-pulse">
                  <div className="h-14 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-16 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-20 bg-slate-100 rounded-2xl w-full" />
                </div>
              ) : selectedTeam ? (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Team ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      #{selectedTeam.id}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Team Name
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {selectedTeam.name}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Designated Manager
                      </p>
                      {selectedTeam.manager ? (
                        <div className="mt-1 flex flex-col">
                          <p className="text-sm font-bold text-slate-950">
                            {selectedTeam.manager.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {selectedTeam.manager.email}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400 italic">
                          None Designated
                        </p>
                      )}
                    </div>
                    <div className="rounded-2xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
                      Lead
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Associated Sectors
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {selectedTeam.sectors &&
                      selectedTeam.sectors.length > 0 ? (
                        selectedTeam.sectors.map((sector) => (
                          <span
                            key={sector.id}
                            className="inline-flex rounded-lg bg-white border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1"
                          >
                            {sector.name}
                          </span>
                        ))
                      ) : selectedTeam.sector_ids &&
                        selectedTeam.sector_ids.length > 0 ? (
                        selectedTeam.sector_ids.map((sectorId) => {
                          const sector = sectors.find(
                            (s) => String(s.id) === String(sectorId)
                          );
                          return sector ? (
                            <span
                              key={sector.id}
                              className="inline-flex rounded-lg bg-white border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1"
                            >
                              {sector.name}
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No associated sectors
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Created At
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      {selectedTeam.created_at
                        ? new Date(selectedTeam.created_at).toLocaleString(
                            undefined,
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }
                          )
                        : "N/A"}
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
                <p className="mt-6 text-sm text-slate-500 text-center">
                  Unable to load details.
                </p>
              )}
            </div>
          )}

          <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Architecture Policy
            </h3>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Aligning sectors creates granular security divisions. Mapped
              managers can administer all sub-assessments.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Team Dedicated Modal */}
      {editModalOpen && teamToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
                  <FiEdit2 className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Edit Team
                </h2>
              </div>
              <button
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-slate-900 transition p-1 rounded-lg hover:bg-slate-100"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Modify the team configuration, associated sectors, and manager.
            </p>

            <form
              onSubmit={handleUpdateTeamSubmit}
              className="mt-6 flex flex-col gap-4"
            >
              {/* Team Name */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  placeholder="e.g. OPERATIONS DELTA"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                  required
                  disabled={updating}
                  autoFocus
                />
              </div>

              {/* Team Manager */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Team Manager
                </label>
                <select
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 appearance-none"
                  required
                  disabled={updating}
                >
                  <option value="">Select a Manager...</option>
                  {eligibleManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Associated Sectors */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Associated Sectors
                </label>
                <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
                  {sectorsLoading ? (
                    <p className="text-xs text-slate-400 italic p-1">
                      Loading sectors...
                    </p>
                  ) : sectors.length > 0 ? (
                    sectors.map((sector) => (
                      <label
                        key={sector.id}
                        className="flex items-center gap-2.5 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={editSelectedSectorIds.includes(sector.id)}
                          onChange={() => handleSectorToggleEdit(sector.id)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-slate-905 focus:ring-slate-900"
                          disabled={updating}
                        />
                        <span className="text-xs text-slate-700 font-semibold">
                          {sector.name}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic p-1">
                      No sectors registered.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editTeamName.trim() || !editManagerId}
                  className="flex-1 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
