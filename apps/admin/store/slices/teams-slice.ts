import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

export function extractErrorMessage(error: any, fallback: string): string {
  if (!error) return fallback;

  if (error.response?.data) {
    const data = error.response.data;

    if (typeof data === "string") {
      return data;
    }

    if (data.errors) {
      if (typeof data.errors === "string") {
        return data.errors;
      }
      if (Array.isArray(data.errors)) {
        return data.errors.join(", ");
      }
      if (typeof data.errors === "object") {
        const messages = Object.entries(data.errors)
          .map(([field, errs]) => {
            const fieldPrefix = field.replace(/_/g, " ");
            const errDetails = Array.isArray(errs) ? errs.join(", ") : String(errs);
            return `${fieldPrefix}: ${errDetails}`;
          });
        if (messages.length > 0) {
          return messages.join(" | ");
        }
      }
    }

    if (data.error) {
      if (typeof data.error === "string") {
        return data.error;
      }
      if (typeof data.error === "object") {
        if (data.error.message) {
          return data.error.message;
        }
        return JSON.stringify(data.error);
      }
    }

    if (data.message) {
      return data.message;
    }

    if (data.detail) {
      return data.detail;
    }
  }

  if (error.message) {
    return error.message;
  }

  return fallback;
}

export type Team = {
  id: string | number;
  name: string;
  manager_id: string | number;
  manager?: {
    id: string | number;
    name: string;
    email: string;
  };
  sector_ids?: (string | number)[];
  sectors?: {
    id: string | number;
    name: string;
  }[];
  created_at?: string;
  updated_at?: string;
};

export type CreateTeamInput = {
  name: string;
  manager_id: string | number;
  sector_ids: (string | number)[];
};

export type UpdateTeamInput = {
  id: string | number;
  name: string;
  manager_id: string | number;
  sector_ids: (string | number)[];
};

export type GetTeamsParams = {
  page?: number;
  limit?: number;
  name?: string;
};

interface TeamsState {
  teams: Team[];
  totalTeams: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  loading: boolean;
  creating: boolean;
  updating: boolean;
  viewLoading: boolean;
  selectedTeam: Team | null;
  error: string | null;
}

const initialState: TeamsState = {
  teams: [],
  totalTeams: 0,
  totalPages: 0,
  currentPage: 1,
  limit: 10,
  hasNext: false,
  hasPrev: false,
  loading: false,
  creating: false,
  updating: false,
  viewLoading: false,
  selectedTeam: null,
  error: null,
};

export const fetchTeams = createAsyncThunk(
  "teams/fetchTeams",
  async (params: GetTeamsParams = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/teams", { params });
      const data = response.data;
      if (Array.isArray(data)) {
        return { teams: data, total: data.length };
      }
      return data; // Expected formats: { teams: [], totalTeams: 0, totalPages: 1, ... }
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, "Failed to fetch teams"));
    }
  }
);

export const fetchTeamById = createAsyncThunk(
  "teams/fetchTeamById",
  async (id: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/teams/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, "Failed to fetch team details"));
    }
  }
);

export const createTeam = createAsyncThunk(
  "teams/createTeam",
  async (data: CreateTeamInput, { rejectWithValue }) => {
    try {
      const response = await api.post("/teams", data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, "Failed to create team"));
    }
  }
);

export const updateTeam = createAsyncThunk(
  "teams/updateTeam",
  async (data: UpdateTeamInput, { rejectWithValue }) => {
    try {
      const { id, ...payload } = data;
      const response = await api.patch(`/teams/${id}`, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(extractErrorMessage(error, "Failed to update team"));
    }
  }
);

const teamsSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedTeam: (state) => {
      state.selectedTeam = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Teams
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action: PayloadAction<{
        teams: Team[];
        totalTeams?: number;
        total?: number;
        totalPages?: number;
        page?: number;
        limit?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
      } | Team[]>) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.teams = action.payload;
          state.totalTeams = action.payload.length;
          state.totalPages = 1;
          state.currentPage = 1;
          state.hasNext = false;
          state.hasPrev = false;
        } else {
          const payload = action.payload;
          state.teams = payload.teams || [];
          state.totalTeams = payload.totalTeams ?? payload.total ?? (payload.teams?.length || 0);
          state.totalPages = payload.totalPages ?? 1;
          state.currentPage = payload.page ?? 1;
          state.limit = payload.limit ?? 10;
          state.hasNext = payload.hasNext ?? false;
          state.hasPrev = payload.hasPrev ?? false;
        }
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Team by ID
      .addCase(fetchTeamById.pending, (state) => {
        state.viewLoading = true;
        state.error = null;
        state.selectedTeam = null;
      })
      .addCase(fetchTeamById.fulfilled, (state, action: PayloadAction<Team>) => {
        state.viewLoading = false;
        state.selectedTeam = action.payload;
      })
      .addCase(fetchTeamById.rejected, (state, action) => {
        state.viewLoading = false;
        state.error = action.payload as string;
      })
      // Create Team
      .addCase(createTeam.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createTeam.fulfilled, (state, action: PayloadAction<Team>) => {
        state.creating = false;
        const newTeam = {
          ...action.payload,
          created_at: action.payload.created_at || new Date().toISOString()
        };
        state.teams.unshift(newTeam);
        state.totalTeams += 1;
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      // Update Team
      .addCase(updateTeam.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateTeam.fulfilled, (state, action: PayloadAction<Team>) => {
        state.updating = false;
        const updated = action.payload;
        state.teams = state.teams.map((t) => (t.id === updated.id ? updated : t));
        if (state.selectedTeam && state.selectedTeam.id === updated.id) {
          state.selectedTeam = updated;
        }
      })
      .addCase(updateTeam.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedTeam } = teamsSlice.actions;
export default teamsSlice.reducer;
