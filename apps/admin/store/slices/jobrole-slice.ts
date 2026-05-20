import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { Sector } from "@/store/slices/sector-slice";

export type JobRole = {
  id: string | number;
  name: string;
  qp_code?: string;
  sector_id: string | number;
  sector?: Sector;
  total_practical_marks: number;
  total_theory_marks: number;
  total_viva_marks: number;
  created_by_user_id?: number;
  created_at?: string;
  updated_at?: string;
};

export type CreateJobRoleInput = {
  name: string;
  qp_code: string;
  sector_id: string | number;
  total_practical_marks?: number;
  total_theory_marks?: number;
  total_viva_marks?: number;
};

export type UpdateJobRoleInput = {
  id: string | number;
  name?: string;
  qp_code?: string;
  sector_id?: string | number;
  total_practical_marks?: number;
  total_theory_marks?: number;
  total_viva_marks?: number;
};

export type GetJobRolesParams = {
  page?: number;
  limit?: number;
  name?: string;
};

interface JobRoleState {
  jobRoles: JobRole[];
  totalJobRoles: number;
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
  selectedJobRole: JobRole | null;
  error: string | null;
}

const initialState: JobRoleState = {
  jobRoles: [],
  totalJobRoles: 0,
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
  selectedJobRole: null,
  error: null,
};

export const fetchJobRoles = createAsyncThunk(
  "jobRoles/fetchJobRoles",
  async (params: GetJobRolesParams = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/jobroles", { params });
      const data = response.data;
      if (Array.isArray(data)) {
        return { jobRoles: data, total: data.length };
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to fetch job roles");
    }
  }
);

export const fetchJobRoleById = createAsyncThunk(
  "jobRoles/fetchJobRoleById",
  async (id: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/jobroles/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to fetch job role details");
    }
  }
);

export const createJobRole = createAsyncThunk(
  "jobRoles/createJobRole",
  async (data: CreateJobRoleInput, { rejectWithValue }) => {
    try {
      const response = await api.post("/jobroles", data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to create job role");
    }
  }
);

export const updateJobRole = createAsyncThunk(
  "jobRoles/updateJobRole",
  async ({ id, ...payload }: UpdateJobRoleInput, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/jobroles/${id}`, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to update job role");
    }
  }
);

export const deleteJobRole = createAsyncThunk(
  "jobRoles/deleteJobRole",
  async (id: string | number, { rejectWithValue }) => {
    try {
      await api.delete(`/jobroles/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to delete job role");
    }
  }
);

const jobRoleSlice = createSlice({
  name: "jobRoles",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedJobRole: (state) => {
      state.selectedJobRole = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Job Roles
      .addCase(fetchJobRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobRoles.fulfilled, (state, action: PayloadAction<{
        jobroles?: JobRole[];
        jobRoles?: JobRole[];
        totalJobRoles?: number;
        total?: number;
        totalPages?: number;
        page?: number;
        limit?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
      } | JobRole[]>) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.jobRoles = action.payload;
          state.totalJobRoles = action.payload.length;
          state.totalPages = 1;
          state.currentPage = 1;
          state.hasNext = false;
          state.hasPrev = false;
        } else {
          const payload = action.payload;
          state.jobRoles = payload.jobroles || payload.jobRoles || [];
          state.totalJobRoles = payload.totalJobRoles ?? payload.total ?? (state.jobRoles.length);
          state.totalPages = payload.totalPages ?? 1;
          state.currentPage = payload.page ?? 1;
          state.limit = payload.limit ?? 10;
          state.hasNext = payload.hasNext ?? false;
          state.hasPrev = payload.hasPrev ?? false;
        }
      })
      .addCase(fetchJobRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Job Role By ID
      .addCase(fetchJobRoleById.pending, (state) => {
        state.viewLoading = true;
        state.error = null;
        state.selectedJobRole = null;
      })
      .addCase(fetchJobRoleById.fulfilled, (state, action: PayloadAction<JobRole>) => {
        state.viewLoading = false;
        state.selectedJobRole = action.payload;
      })
      .addCase(fetchJobRoleById.rejected, (state, action) => {
        state.viewLoading = false;
        state.error = action.payload as string;
      })
      // Create Job Role
      .addCase(createJobRole.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createJobRole.fulfilled, (state, action: PayloadAction<JobRole>) => {
        state.creating = false;
        const newJobRole = {
          ...action.payload,
          created_at: action.payload.created_at || new Date().toISOString()
        };
        state.jobRoles.unshift(newJobRole);
        state.totalJobRoles += 1;
      })
      .addCase(createJobRole.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      // Update Job Role
      .addCase(updateJobRole.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateJobRole.fulfilled, (state, action: PayloadAction<JobRole>) => {
        state.updating = false;
        const index = state.jobRoles.findIndex(jr => jr.id === action.payload.id);
        if (index !== -1) {
          state.jobRoles[index] = action.payload;
        }
        if (state.selectedJobRole?.id === action.payload.id) {
          state.selectedJobRole = action.payload;
        }
      })
      .addCase(updateJobRole.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      // Delete Job Role
      .addCase(deleteJobRole.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteJobRole.fulfilled, (state, action: PayloadAction<string | number>) => {
        state.deleting = false;
        state.jobRoles = state.jobRoles.filter(jr => jr.id !== action.payload);
        state.totalJobRoles = Math.max(0, state.totalJobRoles - 1);
        if (state.selectedJobRole?.id === action.payload) {
          state.selectedJobRole = null;
        }
      })
      .addCase(deleteJobRole.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedJobRole } = jobRoleSlice.actions;
export default jobRoleSlice.reducer;
