import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

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
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to fetch teams");
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
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to fetch team details");
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
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to create team");
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
      });
  },
});

export const { clearError, clearSelectedTeam } = teamsSlice.actions;
export default teamsSlice.reducer;
