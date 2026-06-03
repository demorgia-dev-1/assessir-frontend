"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchSectors,
  createSector,
  updateSector,
  deleteSector,
  fetchSectorById,
  clearError,
  clearSelectedSector,
  Sector,
} from "@/store/slices/sectors-slice";
import { toast } from "react-toastify";
import { FiEye, FiEdit2, FiTrash2, FiX, FiAlertTriangle } from "react-icons/fi";

export default function SectorsPage() {
  const dispatch = useAppDispatch();
  const {
    sectors,
    loading,
    creating,
    updating,
    deleting,
    viewLoading,
    selectedSector,
    error,
    currentPage,
    totalPages,
    totalSectors,
    hasNext,
    hasPrev,
  } = useAppSelector((state) => state.sectors);

  const [newSectorName, setNewSectorName] = useState("");

  // Side Panel state controls (now simplified to create & view modes)
  const [panelMode, setPanelMode] = useState<"create" | "view">("create");

  // Edit Sector Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sectorToEdit, setSectorToEdit] = useState<Sector | null>(null);
  const [editSectorName, setEditSectorName] = useState("");

  // Delete Sector Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sectorToDelete, setSectorToDelete] = useState<Sector | null>(null);

  useEffect(() => {
    dispatch(fetchSectors({ page: 1, limit: 10 }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error, { toastId: error });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handlePageChange = (page: number) => {
    dispatch(fetchSectors({ page, limit: 10 }));
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorName.trim()) return;

    const sectorName = newSectorName;
    const resultAction = await dispatch(createSector({ name: sectorName }));
    if (createSector.fulfilled.match(resultAction)) {
      toast.success(`Sector "${sectorName}" registered successfully!`);
      setNewSectorName("");
    }
  };

  // Dynamic Side Panel - View Details Mode
  const handleViewSector = (id: string | number) => {
    setPanelMode("view");
    dispatch(fetchSectorById(id));
  };

  const handleCloseViewMode = () => {
    setPanelMode("create");
    dispatch(clearSelectedSector());
  };

  // Dedicated Edit Modal Trigger
  const handleEditSector = (sector: Sector) => {
    setSectorToEdit(sector);
    setEditSectorName(sector.name);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSectorToEdit(null);
    setEditSectorName("");
  };

  const handleUpdateSectorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSectorName.trim() || !sectorToEdit) return;

    const nameToUpdate = editSectorName;
    const resultAction = await dispatch(
      updateSector({ id: sectorToEdit.id, name: nameToUpdate })
    );
    if (updateSector.fulfilled.match(resultAction)) {
      toast.success(`Sector successfully updated to "${nameToUpdate}"!`);
      handleCloseEditModal();
    }
  };

  // Dedicated Delete Confirmation Modal Trigger
  const handleDeleteSectorClick = (sector: Sector) => {
    setSectorToDelete(sector);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setSectorToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!sectorToDelete) return;

    const targetName = sectorToDelete.name;
    const resultAction = await dispatch(deleteSector(sectorToDelete.id));
    if (deleteSector.fulfilled.match(resultAction)) {
      toast.success(`Sector "${targetName}" deleted successfully.`);
      handleCloseDeleteModal();

      // Close active side panel details if the deleted sector was being viewed
      if (panelMode === "view" && selectedSector?.id === sectorToDelete.id) {
        handleCloseViewMode();
      }
    }
  };

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      {/* Header section */}
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-8 shadow-soft shadow-slate-900/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Operational Management
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Sectors
            </h1>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-950">{totalSectors}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Registered Sectors
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
                    Sector Name
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Created At
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
                        <div className="h-4 w-24 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-20 ml-auto rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : sectors.length > 0 ? (
                  sectors.map((sector) => (
                    <tr
                      key={sector.id}
                      className="group transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-slate-400">
                        #{sector.id}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-semibold text-slate-900">
                          {sector.name}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {sector.created_at
                          ? new Date(sector.created_at).toLocaleDateString(
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
                            onClick={() => handleViewSector(sector.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="View Details"
                          >
                            <FiEye className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleEditSector(sector)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Sector"
                          >
                            <FiEdit2 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSectorClick(sector)}
                            disabled={deleting}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Delete Sector"
                          >
                            <FiTrash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-20 text-center text-sm text-slate-500"
                    >
                      No sectors found. Create your first sector to begin.
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
                Total {totalSectors} records
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

        {/* Side Panel */}
        <div className="flex flex-col gap-6">
          {panelMode === "create" && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Create New Sector
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Define a new organizational sector for assessments and
                reporting.
              </p>
              <form
                onSubmit={handleCreateSector}
                className="mt-6 flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    Sector Name
                  </label>
                  <input
                    type="text"
                    value={newSectorName}
                    onChange={(e) => setNewSectorName(e.target.value)}
                    placeholder="e.g. TECHNOLOGY"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                    disabled={creating}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating || !newSectorName.trim()}
                  className="mt-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                >
                  {creating ? "Processing..." : "Register Sector"}
                </button>
              </form>
            </div>
          )}

          {panelMode === "view" && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Sector Details
                </h2>
                <button
                  onClick={handleCloseViewMode}
                  className="text-slate-400 hover:text-slate-900 transition p-1 rounded-lg hover:bg-slate-100"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Full registered details for the selected operational sector.
              </p>

              {viewLoading ? (
                <div className="mt-8 space-y-4 animate-pulse">
                  <div className="h-14 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-16 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-16 bg-slate-100 rounded-2xl w-full" />
                </div>
              ) : selectedSector ? (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Sector ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      #{selectedSector.id}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Sector Name
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {selectedSector.name}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Created At
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      {selectedSector.created_at
                        ? new Date(selectedSector.created_at).toLocaleString(
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
              Optimization Note
            </h3>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Large datasets are now paginated to ensure smooth UI performance.
              Each page is limited to 10 records.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Sector Dedicated Modal */}
      {editModalOpen && sectorToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Edit Sector
              </h2>
              <button
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-slate-900 transition p-1 rounded-lg hover:bg-slate-100"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Modify the sector configuration and metadata.
            </p>
            <form
              onSubmit={handleUpdateSectorSubmit}
              className="mt-6 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Sector Name
                </label>
                <input
                  type="text"
                  value={editSectorName}
                  onChange={(e) => setEditSectorName(e.target.value)}
                  placeholder="e.g. TECHNOLOGY"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                  disabled={updating}
                  autoFocus
                />
              </div>
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
                  disabled={updating || !editSectorName.trim()}
                  className="flex-1 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sector Dedicated Confirmation Modal */}
      {deleteModalOpen && sectorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <FiAlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Confirm Deletion
                </h2>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Action is Permanent
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Are you absolutely sure you want to delete the sector{" "}
              <span className="font-semibold text-slate-950">
                "{sectorToDelete.name}"
              </span>
              ? All associated configurations and assessment operations for this
              sector might be affected.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-50 active:scale-[0.98]"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Sector"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
