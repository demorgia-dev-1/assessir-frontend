"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiAlertTriangle, FiEdit2, FiEye, FiTrash2, FiX } from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearError,
  clearSelectedTopic,
  createTopic,
  deleteTopic,
  fetchTopicById,
  fetchTopics,
  Topic,
  updateTopic,
} from "@/store/slices/topics-slice";

export default function TopicsPage() {
  const dispatch = useAppDispatch();
  const {
    topics,
    loading,
    creating,
    updating,
    deleting,
    viewLoading,
    selectedTopic,
    error,
    currentPage,
    totalPages,
    totalTopics,
    hasNext,
    hasPrev,
  } = useAppSelector((state) => state.topics);

  const [newTopicName, setNewTopicName] = useState("");
  const [panelMode, setPanelMode] = useState<"create" | "view">("create");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState<Topic | null>(null);
  const [editTopicName, setEditTopicName] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);

  useEffect(() => {
    dispatch(fetchTopics({ page: 1, limit: 10 }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handlePageChange = (page: number) => {
    dispatch(fetchTopics({ page, limit: 10 }));
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    const topicName = newTopicName.trim();
    const resultAction = await dispatch(createTopic({ name: topicName }));
    if (createTopic.fulfilled.match(resultAction)) {
      toast.success(`Topic "${topicName}" created successfully!`);
      setNewTopicName("");
    }
  };

  const handleViewTopic = (id: string | number) => {
    setPanelMode("view");
    dispatch(fetchTopicById(id));
  };

  const handleCloseViewMode = () => {
    setPanelMode("create");
    dispatch(clearSelectedTopic());
  };

  const handleEditTopic = (topic: Topic) => {
    setTopicToEdit(topic);
    setEditTopicName(topic.name);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setTopicToEdit(null);
    setEditTopicName("");
  };

  const handleUpdateTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicToEdit || !editTopicName.trim()) return;

    const nameToUpdate = editTopicName.trim();
    const resultAction = await dispatch(
      updateTopic({ id: topicToEdit.id, name: nameToUpdate })
    );
    if (updateTopic.fulfilled.match(resultAction)) {
      toast.success(`Topic updated to "${nameToUpdate}"!`);
      handleCloseEditModal();
    }
  };

  const handleDeleteTopicClick = (topic: Topic) => {
    setTopicToDelete(topic);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setTopicToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!topicToDelete) return;

    const targetName = topicToDelete.name;
    const resultAction = await dispatch(deleteTopic(topicToDelete.id));
    if (deleteTopic.fulfilled.match(resultAction)) {
      toast.success(`Topic "${targetName}" deleted successfully.`);
      handleCloseDeleteModal();

      if (panelMode === "view" && selectedTopic?.id === topicToDelete.id) {
        handleCloseViewMode();
      }
    }
  };

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-8 shadow-soft shadow-slate-900/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Content Management
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Topics
            </h1>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-950">{totalTopics}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Registered Topics
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        <div className="glass-panel flex flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ID
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Topic Name
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Created At
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                        <div className="ml-auto h-4 w-20 rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : topics.length > 0 ? (
                  topics.map((topic) => (
                    <tr
                      key={topic.id}
                      className="group transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-slate-400">
                        #{topic.id}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-semibold text-slate-900">
                          {topic.name}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {topic.created_at
                          ? new Date(topic.created_at).toLocaleDateString(
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
                            onClick={() => handleViewTopic(topic.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="View Details"
                          >
                            <FiEye className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleEditTopic(topic)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Topic"
                          >
                            <FiEdit2 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTopicClick(topic)}
                            disabled={deleting}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Delete Topic"
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
                      No topics found. Create your first topic to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
              <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">
                Total {totalTopics} records
              </p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={!hasPrev || loading}
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={!hasNext || loading}
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {panelMode === "create" && (
            <div className="glass-panel animate-in rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5 fade-in duration-300">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Create New Topic
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Register a new topic.
              </p>
              <form
                onSubmit={handleCreateTopic}
                className="mt-6 flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Topic Name
                  </label>
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="e.g. Temp Topic"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                    disabled={creating}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating || !newTopicName.trim()}
                  className="mt-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                >
                  {creating ? "Processing..." : "Create Topic"}
                </button>
              </form>
            </div>
          )}

          {panelMode === "view" && (
            <div className="glass-panel animate-in rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5 fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Topic Details
                </h2>
                <button
                  onClick={handleCloseViewMode}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Full details for the selected topic record.
              </p>

              {viewLoading ? (
                <div className="mt-8 space-y-4 animate-pulse">
                  <div className="h-14 w-full rounded-2xl bg-slate-100" />
                  <div className="h-16 w-full rounded-2xl bg-slate-100" />
                  <div className="h-16 w-full rounded-2xl bg-slate-100" />
                </div>
              ) : selectedTopic ? (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Topic ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      #{selectedTopic.id}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Topic Name
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {selectedTopic.name}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Created At
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      {selectedTopic.created_at
                        ? new Date(selectedTopic.created_at).toLocaleString(
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
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Close Details
                  </button>
                </div>
              ) : (
                <p className="mt-6 text-center text-sm text-slate-500">
                  Unable to load details.
                </p>
              )}
            </div>
          )}

          <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Topic Guidance
            </h3>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Use clear, consistent topic names so assessment content stays easy
              to organize, search, and manage across teams.
            </p>
          </div>
        </div>
      </div>

      {editModalOpen && topicToEdit && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm fade-in duration-200">
          <div className="glass-panel w-full max-w-md animate-in rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Edit Topic
              </h2>
              <button
                onClick={handleCloseEditModal}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Modify the topic name and save the updated record.
            </p>
            <form
              onSubmit={handleUpdateTopicSubmit}
              className="mt-6 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Topic Name
                </label>
                <input
                  type="text"
                  value={editTopicName}
                  onChange={(e) => setEditTopicName(e.target.value)}
                  placeholder="e.g. Temp Topic"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                  disabled={updating}
                  autoFocus
                />
              </div>
              <div className="mt-4 flex gap-3">
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
                  disabled={updating || !editTopicName.trim()}
                  className="flex-1 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && topicToDelete && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm fade-in duration-200">
          <div className="glass-panel w-full max-w-md animate-in rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <FiAlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Confirm Deletion
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Action is Permanent
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Are you absolutely sure you want to delete the topic{" "}
              <span className="font-semibold text-slate-950">
                "{topicToDelete.name}"
              </span>
              ?
            </p>
            <div className="mt-6 flex gap-3">
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
                {deleting ? "Deleting..." : "Delete Topic"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
