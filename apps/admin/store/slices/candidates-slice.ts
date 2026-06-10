import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

export type Candidate = {
  id?: string | number;
  enrollment_no: string;
  password: string;
  batch_id?: string | number;
  created_at?: string;
  updated_at?: string;
};

export type CreateCandidatesInput = {
  batchId: string | number;
  candidates: Array<{ enrollment_no: string; password: string }>;
};

export type DeleteCandidateInput = {
  batchId: string | number;
  candidateId: string | number;
};

interface CandidatesState {
  candidates: Candidate[];
  totalCandidates: number;
  loading: boolean;
  creating: boolean;
  deleting: boolean;
  error: string | null;
  selectedBatchId: string | number | null;
}

const initialState: CandidatesState = {
  candidates: [],
  totalCandidates: 0,
  loading: false,
  creating: false,
  deleting: false,
  error: null,
  selectedBatchId: null,
};

function getErrorMessage(error: any, fallback: string) {
  let message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data ||
    error?.message ||
    fallback;

  if (typeof message === "object" && message !== null) {
    message = message.error || message.message || JSON.stringify(message);
  }

  if (typeof message === "string") {
    try {
      const parsed = JSON.parse(message);
      if (parsed.error) message = parsed.error;
      else if (parsed.message) message = parsed.message;
    } catch {
      // not JSON, use as-is
    }
  }

  return typeof message === "string" ? message : String(message);
}

/**
 * Normalize a raw candidate from the API.
 * The backend returns PascalCase keys (EnrollmentNo, Password, BatchID)
 * but the rest of the app uses snake_case.
 */
function normalizeCandidate(raw: any): Candidate {
  return {
    id: raw.id ?? raw.ID,
    enrollment_no: raw.enrollment_no ?? raw.EnrollmentNo ?? "",
    password: raw.password ?? raw.Password ?? "",
    batch_id: raw.batch_id ?? raw.BatchID ?? raw.batchId,
    created_at: raw.created_at ?? raw.CreatedAt,
    updated_at: raw.updated_at ?? raw.UpdatedAt,
  };
}

export const fetchCandidates = createAsyncThunk(
  "candidates/fetchCandidates",
  async (batchId: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/batches/${batchId}/candidates`);
      return { batchId, data: response.data };
    } catch (error: any) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch candidates")
      );
    }
  }
);

export const createCandidates = createAsyncThunk(
  "candidates/createCandidates",
  async (
    { batchId, candidates }: CreateCandidatesInput,
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/batches/${batchId}/candidates`, {
        candidates,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to create candidates")
      );
    }
  }
);

export const deleteCandidateFromBatch = createAsyncThunk(
  "candidates/deleteCandidate",
  async (
    { batchId, candidateId }: DeleteCandidateInput,
    { rejectWithValue }
  ) => {
    try {
      await api.delete(`/batches/${batchId}/candidates/${candidateId}`);
      return candidateId;
    } catch (error: any) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to delete candidate")
      );
    }
  }
);

const candidatesSlice = createSlice({
  name: "candidates",
  initialState,
  reducers: {
    clearCandidatesError: (state) => {
      state.error = null;
    },
    clearCandidates: (state) => {
      state.candidates = [];
      state.totalCandidates = 0;
      state.selectedBatchId = null;
    },
    setSelectedBatchId: (
      state,
      action: PayloadAction<string | number | null>
    ) => {
      state.selectedBatchId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCandidates
      .addCase(fetchCandidates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCandidates.fulfilled,
        (
          state,
          action: PayloadAction<{ batchId: string | number; data: any }>
        ) => {
          state.loading = false;
          state.selectedBatchId = action.payload.batchId;

          const data = action.payload.data;
          const raw: any[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.candidates)
            ? data.candidates
            : [];

          state.candidates = raw.map(normalizeCandidate);
          state.totalCandidates = state.candidates.length;
        }
      )
      .addCase(fetchCandidates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // createCandidates
      .addCase(createCandidates.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createCandidates.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createCandidates.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })

      // deleteCandidateFromBatch
      .addCase(deleteCandidateFromBatch.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(
        deleteCandidateFromBatch.fulfilled,
        (state, action: PayloadAction<string | number>) => {
          state.deleting = false;
          state.candidates = state.candidates.filter(
            (c) => c.id !== action.payload
          );
          state.totalCandidates = Math.max(0, state.totalCandidates - 1);
        }
      )
      .addCase(deleteCandidateFromBatch.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCandidatesError, clearCandidates, setSelectedBatchId } =
  candidatesSlice.actions;
export default candidatesSlice.reducer;
