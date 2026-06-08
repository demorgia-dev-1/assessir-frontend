"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiEdit2,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import ImportGroupsModal from "@/components/ImportGroupsModal";
import { downloadGroupsTemplate } from "@/lib/groups-import";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearGroupError,
  clearSelectedGroup,
  createGroups,
  deleteGroup,
  fetchGroupById,
  fetchGroups,
  Group,
  GroupCandidate,
  updateGroup,
} from "@/store/slices/groups-slice";

const INPUT_CLASS =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

type CandidateForm = {
  enrollment_no: string;
  password: string;
};

type GroupFormState = {
  name: string;
  candidates: CandidateForm[];
};

function createCandidate(
  overrides: Partial<CandidateForm> = {}
): CandidateForm {
  return {
    enrollment_no: "",
    password: "",
    ...overrides,
  };
}

function createEmptyForm(): GroupFormState {
  return {
    name: "",
    candidates: [createCandidate()],
  };
}

function normalizeGroupToForm(group: Group): GroupFormState {
  return {
    name: group.name ?? "",
    candidates: group.candidates?.length
      ? group.candidates.map((candidate) => ({
          enrollment_no: candidate.enrollment_no ?? "",
          password: candidate.password ?? "",
        }))
      : [createCandidate()],
  };
}

function buildPayload(form: GroupFormState): {
  name: string;
  candidates: GroupCandidate[];
} | null {
  const name = form.name.trim();
  const candidates = form.candidates
    .map((candidate) => ({
      enrollment_no: candidate.enrollment_no.trim(),
      password: candidate.password.trim(),
    }))
    .filter((candidate) => candidate.enrollment_no && candidate.password);

  if (!name) {
    toast.error("Group name is required.");
    return null;
  }

  if (!candidates.length) {
    toast.error(
      "Add at least one candidate with enrollment number and password."
    );
    return null;
  }

  return { name, candidates };
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function GroupsPage() {
  const dispatch = useAppDispatch();
  const {
    groups,
    totalGroups,
    totalPages,
    currentPage,
    limit,
    hasNext,
    hasPrev,
    loading,
    creating,
    updating,
    deleting,
    viewLoading,
    selectedGroup,
    error,
  } = useAppSelector((state) => state.groups);

  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [form, setForm] = useState<GroupFormState>(createEmptyForm);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const hasLoadedInitially = useRef(false);

  useEffect(() => {
    if (!error) return;
    toast.error(error, { toastId: error });
    dispatch(clearGroupError());
  }, [dispatch, error]);

  useEffect(() => {
    if (!hasLoadedInitially.current) {
      hasLoadedInitially.current = true;
      dispatch(
        fetchGroups({
          page: 1,
          limit,
          name: search.trim() || undefined,
        })
      );
      return;
    }

    const timeout = window.setTimeout(() => {
      dispatch(
        fetchGroups({
          page: 1,
          limit,
          name: search.trim() || undefined,
        })
      );
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [dispatch, search, limit]);

  const totalCandidates = useMemo(
    () =>
      groups.reduce(
        (sum, group) =>
          sum + (Array.isArray(group.candidates) ? group.candidates.length : 0),
        0
      ),
    [groups]
  );

  const largestGroup = useMemo(() => {
    if (!groups.length) return null;
    return groups.reduce((largest, group) =>
      (group.candidates?.length ?? 0) > (largest.candidates?.length ?? 0)
        ? group
        : largest
    );
  }, [groups]);

  const resetForm = () => {
    setForm(createEmptyForm());
    setGroupToEdit(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalMode("create");
    resetForm();
  };

  const openCreateModal = () => {
    setModalMode("create");
    setForm(createEmptyForm());
    setGroupToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setModalMode("edit");
    setGroupToEdit(group);
    setForm(normalizeGroupToForm(group));
    setIsModalOpen(true);
  };

  const refreshList = (page = currentPage) => {
    dispatch(
      fetchGroups({
        page,
        limit,
        name: search.trim() || undefined,
      })
    );
  };

  const handleView = (id: string | number) => {
    dispatch(fetchGroupById(id));
  };

  const closeView = () => {
    dispatch(clearSelectedGroup());
  };

  const handlePageChange = (page: number) => {
    dispatch(
      fetchGroups({
        page,
        limit,
        name: search.trim() || undefined,
      })
    );
  };

  const handleFormChange = (field: keyof GroupFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCandidateChange = (
    index: number,
    field: keyof CandidateForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      candidates: current.candidates.map((candidate, candidateIndex) =>
        candidateIndex === index ? { ...candidate, [field]: value } : candidate
      ),
    }));
  };

  const addCandidate = () => {
    setForm((current) => ({
      ...current,
      candidates: [...current.candidates, createCandidate()],
    }));
  };

  const removeCandidate = (index: number) => {
    setForm((current) => ({
      ...current,
      candidates:
        current.candidates.length === 1
          ? [createCandidate()]
          : current.candidates.filter(
              (_, candidateIndex) => candidateIndex !== index
            ),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload(form);
    if (!payload) return;

    const resultAction =
      modalMode === "edit" && groupToEdit
        ? await dispatch(updateGroup({ id: groupToEdit.id, ...payload }))
        : await dispatch(createGroups({ groups: [payload] }));

    const isSuccess =
      modalMode === "edit"
        ? updateGroup.fulfilled.match(resultAction)
        : createGroups.fulfilled.match(resultAction);

    if (!isSuccess) return;

    const updatedGroupId = modalMode === "edit" ? groupToEdit?.id : null;
    toast.success(
      modalMode === "edit"
        ? `Group "${payload.name}" updated successfully.`
        : `Group "${payload.name}" created successfully.`
    );
    closeModal();
    refreshList(modalMode === "create" ? 1 : currentPage);
    if (updatedGroupId && selectedGroup?.id === updatedGroupId) {
      dispatch(fetchGroupById(updatedGroupId));
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;

    const resultAction = await dispatch(deleteGroup(groupToDelete.id));
    if (!deleteGroup.fulfilled.match(resultAction)) return;

    toast.success(`Group "${groupToDelete.name}" deleted successfully.`);
    if (selectedGroup?.id === groupToDelete.id) {
      closeView();
    }
    setGroupToDelete(null);
    refreshList();
  };

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-8 shadow-soft shadow-slate-900/5">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Candidate Operations
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Groups
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadGroupsTemplate}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              <FiDownload className="h-4 w-4" />
              Template
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              <FiUploadCloud className="h-4 w-4" />
              Upload Excel
            </button>
            {/* <button
              onClick={() => refreshList()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              <FiRefreshCw className="h-4 w-4" />
              Refresh
            </button> */}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800"
            >
              <FiPlus className="h-4 w-4" />
              Create Group
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 gap-6 xl:min-h-[calc(100vh-18rem)] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              {/* <h2 className="text-lg font-semibold text-slate-950">Groups</h2> */}
              {/* <p className="text-sm text-slate-500">
                Search and manage assessment groups in one place.
              </p> */}
            </div>

            <label className="relative w-full md:max-w-sm">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by group name"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    ID
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Group
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-5">
                        <div className="h-4 w-40 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-20 rounded bg-slate-100" />
                      </td>
                      {/* <td className="px-6 py-5">
                        <div className="h-4 w-24 rounded bg-slate-100" />
                      </td> */}
                      <td className="px-6 py-5">
                        <div className="ml-auto h-4 w-24 rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : groups.length ? (
                  groups.map((group) => (
                    <tr
                      key={group.id}
                      onClick={() => handleView(group.id)}
                      className={`group cursor-pointer transition-colors hover:bg-slate-50/50 ${
                        String(selectedGroup?.id) === String(group.id)
                          ? "bg-slate-50/70"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-5 text-sm text-slate-600">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold text-slate-600">
                          {group.id}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-950">
                            {group.name || "Untitled group"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-500">
                        {formatDate(group.created_at)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleView(group.id);
                            }}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                            title="View group"
                          >
                            <FiEye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(group);
                            }}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                            title="Edit group"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setGroupToDelete(group);
                            }}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            title="Delete group"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-14 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center">
                        <div className="rounded-3xl bg-slate-100 p-4 text-slate-500">
                          <FiUsers className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">
                          No groups found
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          Create your first group to start assigning candidates.
                        </p>
                        <button
                          onClick={openCreateModal}
                          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <FiPlus className="h-4 w-4" />
                          Create Group
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrev || loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNext || loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <aside className="glass-panel flex min-h-0 flex-col rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5 xl:max-h-[calc(100vh-18rem)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Group Details
              </h2>
              <p className="text-sm text-slate-500">
                Inspect candidates before publishing credentials.
              </p>
            </div>
            {selectedGroup && (
              <button
                onClick={closeView}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                title="Close details"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex-1 px-6 py-5">
            {viewLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 w-2/3 rounded bg-slate-100" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-24 rounded-3xl bg-slate-100" />
              </div>
            ) : selectedGroup ? (
              <div className="space-y-5">
                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Selected Group
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-slate-950">
                    {selectedGroup.name}
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Group ID
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedGroup.id}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Candidates
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedGroup.candidates?.length ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Candidate Credentials
                    </h4>
                    <button
                      onClick={() => openEditModal(selectedGroup)}
                      className="text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                    >
                      Edit group
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedGroup.candidates?.length ? (
                      selectedGroup.candidates.map((candidate, index) => (
                        <div
                          key={`${candidate.enrollment_no}-${index}`}
                          className="rounded-[1.5rem] border border-slate-100 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Enrollment
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-950">
                                {candidate.enrollment_no}
                              </p>
                            </div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              {index + 1}
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Password
                            </p>
                            <p className="mt-1 break-all text-sm font-medium text-slate-600">
                              {candidate.password}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                        No candidates in this group.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="rounded-3xl bg-slate-100 p-4 text-slate-500">
                  <FiUsers className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  No group selected
                </h3>
                <p className="mt-2 max-w-xs text-sm text-slate-500">
                  Pick a group from the directory to review candidate
                  credentials.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 modal-overlay">
          <div className="glass-panel max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/80 shadow-2xl shadow-slate-950/15">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {modalMode === "edit" ? "Update" : "Create"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {modalMode === "edit" ? "Edit Group" : "Create New Group"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(90vh-88px)] overflow-y-auto"
            >
              <div className="grid gap-6 px-6 py-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/70 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Quick Summary
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Group Name
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {form.name.trim() || "Untitled group"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Candidate Rows
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {form.candidates.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Ready to Save
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {
                          form.candidates.filter(
                            (candidate) =>
                              candidate.enrollment_no.trim() &&
                              candidate.password.trim()
                          ).length
                        }{" "}
                        candidates
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Group Name
                    </label>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        handleFormChange("name", event.target.value)
                      }
                      placeholder="Enter group name"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Candidates
                        </h3>
                        <p className="text-sm text-slate-500">
                          Add enrollment credentials for every candidate in this
                          group.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addCandidate}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      >
                        <FiPlus className="h-4 w-4" />
                        Add Candidate
                      </button>
                    </div>

                    <div className="space-y-4">
                      {form.candidates.map((candidate, index) => (
                        <div
                          key={index}
                          className="rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-sm shadow-slate-900/5"
                        >
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                                Candidate {index + 1}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCandidate(index)}
                              className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              title="Remove candidate"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Enrollment No
                              </label>
                              <input
                                value={candidate.enrollment_no}
                                onChange={(event) =>
                                  handleCandidateChange(
                                    index,
                                    "enrollment_no",
                                    event.target.value
                                  )
                                }
                                placeholder="ENR001"
                                className={INPUT_CLASS}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Password
                              </label>
                              <input
                                value={candidate.password}
                                onChange={(event) =>
                                  handleCandidateChange(
                                    index,
                                    "password",
                                    event.target.value
                                  )
                                }
                                placeholder="Password1"
                                className={INPUT_CLASS}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating || updating
                    ? "Saving..."
                    : modalMode === "edit"
                    ? "Update Group"
                    : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 modal-overlay">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-6 shadow-2xl shadow-slate-950/10">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
                <FiAlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Delete group
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Delete{" "}
                  <span className="font-semibold text-slate-700">
                    {groupToDelete.name}
                  </span>{" "}
                  and remove its candidate credentials from this list.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setGroupToDelete(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportGroupsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </section>
  );
}
