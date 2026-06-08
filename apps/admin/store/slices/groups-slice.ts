import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

export type GroupCandidate = {
  id?: string | number;
  enrollment_no: string;
  password: string;
  group_id?: string | number;
  created_at?: string;
  updated_at?: string;
};

export type Group = {
  id: string | number;
  name: string;
  candidates: GroupCandidate[];
  created_at?: string;
  updated_at?: string;
};

export type GroupPayload = {
  name: string;
  candidates: GroupCandidate[];
};

export type CreateGroupsInput = {
  groups: GroupPayload[];
};

export type UpdateGroupInput = {
  id: string | number;
  name?: string;
  candidates?: GroupCandidate[];
};

export type GetGroupsParams = {
  page?: number;
  limit?: number;
  name?: string;
};

type GroupApiShape = Partial<Group> & {
  id?: string | number;
  name?: string;
  candidates?: GroupCandidate[];
};

type GroupCandidateApiShape = Partial<GroupCandidate> & {
  EnrollmentNo?: string;
  Password?: string;
  GroupID?: string | number;
};

type GroupDetailApiShape = {
  groupId?: string | number;
  candidates?: GroupCandidateApiShape[];
  page?: number;
  limit?: number;
  totalCandidates?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
};

interface GroupsState {
  groups: Group[];
  totalGroups: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  viewLoading: boolean;
  selectedGroup: Group | null;
  error: string | null;
}

const initialState: GroupsState = {
  groups: [],
  totalGroups: 0,
  totalPages: 0,
  currentPage: 1,
  limit: 10,
  hasNext: false,
  hasPrev: false,
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  viewLoading: false,
  selectedGroup: null,
  error: null,
};

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function normalizeCandidate(
  candidate: GroupCandidateApiShape
): GroupCandidate {
  return {
    id: candidate.id,
    enrollment_no: candidate.enrollment_no ?? candidate.EnrollmentNo ?? "",
    password: candidate.password ?? candidate.Password ?? "",
    group_id: candidate.group_id ?? candidate.GroupID,
    created_at: candidate.created_at,
    updated_at: candidate.updated_at,
  };
}

function normalizeGroup(group: GroupApiShape): Group {
  return {
    id: group.id ?? "",
    name: group.name ?? "",
    candidates: Array.isArray(group.candidates)
      ? group.candidates.map(normalizeCandidate)
      : [],
    created_at: group.created_at,
    updated_at: group.updated_at,
  };
}

function isGroupDetailPayload(
  payload: GroupApiShape | GroupDetailApiShape
): payload is GroupDetailApiShape {
  return "groupId" in payload || "totalCandidates" in payload;
}

function normalizeGroupDetail(
  payload: GroupDetailApiShape,
  existingGroup?: Group | null
): Group {
  const normalizedCandidates = Array.isArray(payload.candidates)
    ? payload.candidates.map(normalizeCandidate)
    : [];

  const firstCandidate = normalizedCandidates[0];

  return {
    id:
      payload.groupId ??
      firstCandidate?.group_id ??
      existingGroup?.id ??
      "",
    name: existingGroup?.name ?? "",
    candidates: normalizedCandidates,
    created_at:
      existingGroup?.created_at ?? firstCandidate?.created_at ?? undefined,
    updated_at:
      existingGroup?.updated_at ?? firstCandidate?.updated_at ?? undefined,
  };
}

export const fetchGroups = createAsyncThunk(
  "groups/fetchGroups",
  async (params: GetGroupsParams = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/groups", { params });
      const data = response.data;
      if (Array.isArray(data)) {
        return { groups: data, total: data.length };
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch groups"));
    }
  }
);

export const fetchGroupById = createAsyncThunk(
  "groups/fetchGroupById",
  async (id: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/groups/${id}/candidates`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch group details")
      );
    }
  }
);

export const createGroups = createAsyncThunk(
  "groups/createGroups",
  async (payload: CreateGroupsInput, { rejectWithValue }) => {
    try {
      const response = await api.post("/groups", payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to create groups"));
    }
  }
);

export const updateGroup = createAsyncThunk(
  "groups/updateGroup",
  async ({ id, ...payload }: UpdateGroupInput, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/groups/${id}`, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to update group"));
    }
  }
);

export const deleteGroup = createAsyncThunk(
  "groups/deleteGroup",
  async (id: string | number, { rejectWithValue }) => {
    try {
      await api.delete(`/groups/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to delete group"));
    }
  }
);

const groupsSlice = createSlice({
  name: "groups",
  initialState,
  reducers: {
    clearGroupError: (state) => {
      state.error = null;
    },
    clearSelectedGroup: (state) => {
      state.selectedGroup = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchGroups.fulfilled,
        (
          state,
          action: PayloadAction<
            | {
                groups?: GroupApiShape[];
                totalGroups?: number;
                total?: number;
                totalPages?: number;
                page?: number;
                limit?: number;
                hasNext?: boolean;
                hasPrev?: boolean;
              }
            | GroupApiShape[]
          >
        ) => {
          state.loading = false;
          if (Array.isArray(action.payload)) {
            state.groups = action.payload.map(normalizeGroup);
            state.totalGroups = state.groups.length;
            state.totalPages = 1;
            state.currentPage = 1;
            state.hasNext = false;
            state.hasPrev = false;
            return;
          }

          const payload = action.payload;
          state.groups = (payload.groups || []).map(normalizeGroup);
          state.totalGroups =
            payload.totalGroups ?? payload.total ?? state.groups.length;
          state.totalPages = payload.totalPages ?? 1;
          state.currentPage = payload.page ?? 1;
          state.limit = payload.limit ?? 10;
          state.hasNext = payload.hasNext ?? state.currentPage < state.totalPages;
          state.hasPrev = payload.hasPrev ?? state.currentPage > 1;
        }
      )
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchGroupById.pending, (state) => {
        state.viewLoading = true;
        state.error = null;
        state.selectedGroup = null;
      })
      .addCase(
        fetchGroupById.fulfilled,
        (state, action: PayloadAction<GroupDetailApiShape | GroupApiShape>) => {
          state.viewLoading = false;
          const payload = action.payload;
          if (isGroupDetailPayload(payload)) {
            const existingGroup = state.groups.find(
              (group) => String(group.id) === String(payload.groupId ?? "")
            );
            state.selectedGroup = normalizeGroupDetail(payload, existingGroup);
            return;
          }

          state.selectedGroup = normalizeGroup(payload);
        }
      )
      .addCase(fetchGroupById.rejected, (state, action) => {
        state.viewLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createGroups.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createGroups.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createGroups.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      .addCase(updateGroup.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(
        updateGroup.fulfilled,
        (state, action: PayloadAction<GroupApiShape>) => {
          state.updating = false;
          const updatedGroup = normalizeGroup(action.payload);
          const index = state.groups.findIndex(
            (group) => group.id === updatedGroup.id
          );
          if (index !== -1) {
            state.groups[index] = updatedGroup;
          }
          if (state.selectedGroup?.id === updatedGroup.id) {
            state.selectedGroup = updatedGroup;
          }
        }
      )
      .addCase(updateGroup.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      .addCase(deleteGroup.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(
        deleteGroup.fulfilled,
        (state, action: PayloadAction<string | number>) => {
          state.deleting = false;
          state.groups = state.groups.filter(
            (group) => group.id !== action.payload
          );
          state.totalGroups = Math.max(0, state.totalGroups - 1);
          if (state.selectedGroup?.id === action.payload) {
            state.selectedGroup = null;
          }
        }
      )
      .addCase(deleteGroup.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearGroupError, clearSelectedGroup } = groupsSlice.actions;
export default groupsSlice.reducer;
