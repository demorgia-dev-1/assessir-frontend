"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchJobRoles,
  updateJobRole,
  deleteJobRole,
  fetchJobRoleById,
  clearError,
  clearSelectedJobRole,
  JobRole,
} from "@/store/slices/jobroles-slice";
import { fetchSectors } from "@/store/slices/sectors-slice";
import { toast } from "react-toastify";
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiX,
  FiAlertTriangle,
  FiUploadCloud,
} from "react-icons/fi";
import ImportJobRolesModal from "@/components/ImportJobRolesModal";

export default function JobRolesPage() {
  const dispatch = useAppDispatch();

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Job Roles State
  const {
    jobRoles,
    loading,
    updating,
    deleting,
    viewLoading,
    selectedJobRole,
    error,
    currentPage,
    totalPages,
    totalJobRoles,
    hasNext,
    hasPrev,
  } = useAppSelector((state) => state.jobRoles);

  // Sectors State (for sector selection dropdown)
  const { sectors } = useAppSelector((state) => state.sectors);

  // Sector selection for bulk import
  const [sectorId, setSectorId] = useState("");

  // Side Panel state controls (import & view modes)
  const [panelMode, setPanelMode] = useState<"import" | "view">("import");

  // Edit Job Role Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [jobRoleToEdit, setJobRoleToEdit] = useState<JobRole | null>(null);
  const [editName, setEditName] = useState("");
  const [editQpCode, setEditQpCode] = useState("");
  const [editSectorId, setEditSectorId] = useState("");
  const [editTotalPracticalMarks, setEditTotalPracticalMarks] = useState("");
  const [editTotalTheoryMarks, setEditTotalTheoryMarks] = useState("");
  const [editTotalVivaMarks, setEditTotalVivaMarks] = useState("");

  // Delete Job Role Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [jobRoleToDelete, setJobRoleToDelete] = useState<JobRole | null>(null);

  // Load job roles and sectors on mount
  useEffect(() => {
    dispatch(fetchJobRoles({ page: 1, limit: 10 }));
    dispatch(fetchSectors({ page: 1, limit: 1000 }));
  }, [dispatch]);

  // Handle Redux state errors
  useEffect(() => {
    if (error) {
      toast.error(error, { toastId: error });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handlePageChange = (page: number) => {
    dispatch(fetchJobRoles({ page, limit: 10 }));
  };

  // Get selected sector name for display
  const selectedSectorName =
    sectors.find((s) => String(s.id) === sectorId)?.name || "";

  // View Details Mode
  const handleViewJobRole = (id: string | number) => {
    setPanelMode("view");
    dispatch(fetchJobRoleById(id));
  };

  const handleCloseViewMode = () => {
    setPanelMode("import");
    dispatch(clearSelectedJobRole());
  };

  // Edit Modal Trigger
  const handleEditJobRole = (jobRole: JobRole) => {
    setJobRoleToEdit(jobRole);
    setEditName(jobRole.name);
    setEditQpCode(jobRole.qp_code || "");
    setEditSectorId(String(jobRole.sector_id));
    setEditTotalPracticalMarks(
      jobRole.total_practical_marks !== undefined &&
        jobRole.total_practical_marks !== null
        ? String(jobRole.total_practical_marks)
        : ""
    );
    setEditTotalTheoryMarks(
      jobRole.total_theory_marks !== undefined &&
        jobRole.total_theory_marks !== null
        ? String(jobRole.total_theory_marks)
        : ""
    );
    setEditTotalVivaMarks(
      jobRole.total_viva_marks !== undefined &&
        jobRole.total_viva_marks !== null
        ? String(jobRole.total_viva_marks)
        : ""
    );
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setJobRoleToEdit(null);
    setEditName("");
    setEditQpCode("");
    setEditSectorId("");
    setEditTotalPracticalMarks("");
    setEditTotalTheoryMarks("");
    setEditTotalVivaMarks("");
  };

  const handleUpdateJobRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editName.trim() ||
      !editQpCode.trim() ||
      !editSectorId ||
      !jobRoleToEdit
    ) {
      toast.error("Name, QP code and sector are required.");
      return;
    }

    const payload: any = {
      id: jobRoleToEdit.id,
      name: editName.trim(),
      qp_code: editQpCode.trim(),
      sector_id: Number(editSectorId),
    };

    if (editTotalPracticalMarks.trim() !== "") {
      payload.total_practical_marks = Number(editTotalPracticalMarks);
    }
    if (editTotalTheoryMarks.trim() !== "") {
      payload.total_theory_marks = Number(editTotalTheoryMarks);
    }
    if (editTotalVivaMarks.trim() !== "") {
      payload.total_viva_marks = Number(editTotalVivaMarks);
    }

    const resultAction = await dispatch(updateJobRole(payload));
    if (updateJobRole.fulfilled.match(resultAction)) {
      toast.success(`Job Role updated successfully!`);
      handleCloseEditModal();

      // Refresh list to pull updated nested models or references
      dispatch(fetchJobRoles({ page: currentPage, limit: 10 }));
    }
  };

  // Delete Confirmation Modal Trigger
  const handleDeleteJobRoleClick = (jobRole: JobRole) => {
    setJobRoleToDelete(jobRole);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setJobRoleToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!jobRoleToDelete) return;

    const targetName = jobRoleToDelete.name;
    const resultAction = await dispatch(deleteJobRole(jobRoleToDelete.id));
    if (deleteJobRole.fulfilled.match(resultAction)) {
      toast.success(`Job Role "${targetName}" deleted successfully.`);
      handleCloseDeleteModal();

      // Close active side panel details if the deleted job role was being viewed
      if (panelMode === "view" && selectedJobRole?.id === jobRoleToDelete.id) {
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
              Job Roles
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="border-l border-slate-200 pl-6 text-right">
              <p className="text-3xl font-bold text-slate-950">
                {totalJobRoles}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Registered Job Roles
              </p>
            </div>
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
                    Name
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sector
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Marks (T/P/V)
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
                        <div className="h-4 w-28 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-24 mx-auto rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-20 ml-auto rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : jobRoles.length > 0 ? (
                  jobRoles.map((jobRole) => (
                    <tr
                      key={jobRole.id}
                      className="group transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-slate-400">
                        #{jobRole.id}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">
                            {jobRole.name}
                          </span>
                          {jobRole.qp_code && (
                            <span className="text-xs text-slate-400 font-medium mt-0.5">
                              QP Code: {jobRole.qp_code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                          {jobRole.sector?.name ||
                            sectors.find(
                              (s) => String(s.id) === String(jobRole.sector_id)
                            )?.name ||
                            `Sector ID: ${jobRole.sector_id}`}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center text-sm font-medium text-slate-600">
                        {jobRole.total_theory_marks} /{" "}
                        {jobRole.total_practical_marks} /{" "}
                        {jobRole.total_viva_marks}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleViewJobRole(jobRole.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="View Details"
                          >
                            <FiEye className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleEditJobRole(jobRole)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Job Role"
                          >
                            <FiEdit2 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteJobRoleClick(jobRole)}
                            disabled={deleting}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Delete Job Role"
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
                      colSpan={5}
                      className="px-6 py-20 text-center text-sm text-slate-500"
                    >
                      No job roles found. Create your first job role to begin.
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
                Total {totalJobRoles} records
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
          {panelMode === "import" && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Bulk Import Job Roles
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Select a sector first, then import job roles from an Excel file.
              </p>

              <div className="mt-6 flex flex-col gap-5">
                {/* Sector Select Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    Select Sector
                  </label>
                  <select
                    value={sectorId}
                    onChange={(e) => setSectorId(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 appearance-none cursor-pointer"
                  >
                    <option value="">Select a Sector...</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected sector badge */}
                {sectorId && (
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 animate-in fade-in duration-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Selected Sector
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {selectedSectorName}
                    </p>
                  </div>
                )}

                {/* Import Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!sectorId) {
                      toast.error("Please select a sector first.");
                      return;
                    }
                    setImportModalOpen(true);
                  }}
                  disabled={!sectorId}
                  className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  <FiUploadCloud className="h-4.5 w-4.5" />
                  Import Excel
                </button>

                {!sectorId && (
                  <p className="text-xs text-slate-400 text-center -mt-2">
                    Select a sector above to enable import
                  </p>
                )}
              </div>
            </div>
          )}

          {panelMode === "view" && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Job Role Details
                </h2>
                <button
                  onClick={handleCloseViewMode}
                  className="text-slate-400 hover:text-slate-900 transition p-1 rounded-lg hover:bg-slate-100"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Details, parameters, and configuration of the selected job role.
              </p>

              {viewLoading ? (
                <div className="mt-8 space-y-4 animate-pulse">
                  <div className="h-14 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-16 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-28 bg-slate-100 rounded-2xl w-full" />
                </div>
              ) : selectedJobRole ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Job Role ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      #{selectedJobRole.id}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Name
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {selectedJobRole.name}
                    </p>
                  </div>
                  {selectedJobRole.qp_code && (
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        QP Code
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-950">
                        {selectedJobRole.qp_code}
                      </p>
                    </div>
                  )}
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Associated Sector
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {selectedJobRole.sector?.name ||
                        sectors.find(
                          (s) =>
                            String(s.id) === String(selectedJobRole.sector_id)
                        )?.name ||
                        `Sector ID: ${selectedJobRole.sector_id}`}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      Evaluation Marks Target
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">
                          Theory
                        </span>
                        <span className="text-sm font-bold text-slate-950">
                          {selectedJobRole.total_theory_marks}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">
                          Practical
                        </span>
                        <span className="text-sm font-bold text-slate-950">
                          {selectedJobRole.total_practical_marks}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">
                          Viva
                        </span>
                        <span className="text-sm font-bold text-slate-950">
                          {selectedJobRole.total_viva_marks}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Last Updated
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      {selectedJobRole.updated_at
                        ? new Date(selectedJobRole.updated_at).toLocaleString(
                            undefined,
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }
                          )
                        : selectedJobRole.created_at
                        ? new Date(selectedJobRole.created_at).toLocaleString(
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
              Assigned parameters are cached and synchronised seamlessly.
              Pagination of 10 items is strictly applied to optimize UI.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Job Role Dedicated Modal */}
      {editModalOpen && jobRoleToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Edit Job Role
              </h2>
              <button
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-slate-900 transition p-1 rounded-lg hover:bg-slate-100"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Modify the operational job role configurations and scoring
              thresholds.
            </p>

            <form
              onSubmit={handleUpdateJobRoleSubmit}
              className="mt-6 flex flex-col gap-4"
            >
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Job Role Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. SOFTWARE ENGINEER"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                  disabled={updating}
                  autoFocus
                />
              </div>

              {/* QP Code */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  QP Code
                </label>
                <input
                  type="text"
                  value={editQpCode}
                  onChange={(e) => setEditQpCode(e.target.value)}
                  placeholder="e.g. SSC/Q0501"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                  disabled={updating}
                />
              </div>

              {/* Sector Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Sector
                </label>
                <select
                  value={editSectorId}
                  onChange={(e) => setEditSectorId(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 cursor-pointer"
                  disabled={updating}
                >
                  <option value="">Select a Sector...</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marks breakdown */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-tight text-slate-400 text-center block w-full whitespace-nowrap">
                    Theory Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editTotalTheoryMarks}
                    onChange={(e) => setEditTotalTheoryMarks(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/5"
                    disabled={updating}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-tight text-slate-400 text-center block w-full whitespace-nowrap">
                    Practical Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editTotalPracticalMarks}
                    onChange={(e) => setEditTotalPracticalMarks(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/5"
                    disabled={updating}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-tight text-slate-400 text-center block w-full whitespace-nowrap">
                    Viva Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editTotalVivaMarks}
                    onChange={(e) => setEditTotalVivaMarks(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-950/5"
                    disabled={updating}
                  />
                </div>
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
                  disabled={updating || !editName.trim() || !editSectorId}
                  className="flex-1 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Job Role Dedicated Confirmation Modal */}
      {deleteModalOpen && jobRoleToDelete && (
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
              Are you absolutely sure you want to delete the job role{" "}
              <span className="font-semibold text-slate-950">
                "{jobRoleToDelete.name}"
              </span>
              ? This will remove all associated thresholds and configurations
              from the system.
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
                {deleting ? "Deleting..." : "Delete Job Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <ImportJobRolesModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        sectorId={Number(sectorId)}
        sectorName={selectedSectorName}
      />
    </section>
  );
}
