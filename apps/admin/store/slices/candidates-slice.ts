import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
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

export type DeleteCandidatesInput = {
  batchId: string | number;
  candidateIds: Array<string | number>;
};

export type ResetCandidateInput = {
  batchId: string | number;
  candidateId: string | number;
};

interface CandidatesState {
  candidates: Candidate[];
  totalCandidates: number;
  loading: boolean;
  creating: boolean;
  deleting: boolean;
  resetting: boolean;
  error: string | null;
  selectedBatchId: string | number | null;
}

const initialState: CandidatesState = {
  candidates: [],
  totalCandidates: 0,
  loading: false,
  creating: false,
  deleting: false,
  resetting: false,
  error: null,
  selectedBatchId: null,
};

function getErrorMessage(error: any, fallback: string) {
  let message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.errors ||
    error?.response?.data ||
    error?.message ||
    fallback;

  if (typeof message === "object" && message !== null) {
    if (message.errors) {
      if (Array.isArray(message.errors)) {
        message = message.errors.join(", ");
      } else if (typeof message.errors === "object") {
        message = Object.values(message.errors).flat().join(", ");
      }
    } else {
      message = message.error || message.message || JSON.stringify(message);
    }
  }

  if (typeof message === "string") {
    try {
      const parsed = JSON.parse(message);
      if (parsed.errors) {
        if (Array.isArray(parsed.errors)) {
          message = parsed.errors.join(", ");
        } else if (typeof parsed.errors === "object") {
          message = Object.values(parsed.errors).flat().join(", ");
        }
      } else if (parsed.error) {
        message = parsed.error;
      } else if (parsed.message) {
        message = parsed.message;
      }
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
      const message = getErrorMessage(error, "Failed to fetch candidates");
      toast.error(message);
      return rejectWithValue(message);
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
      toast.success("Candidates added successfully.");
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error, "Failed to create candidates");
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCandidatesFromBatch = createAsyncThunk(
  "candidates/deleteCandidates",
  async (
    { batchId, candidateIds }: DeleteCandidatesInput,
    { rejectWithValue }
  ) => {
    try {
      await api.delete(`/batches/${batchId}/candidates`, {
        data: { candidate_ids: candidateIds },
      });
      toast.success("Candidates deleted successfully.");
      return candidateIds;
    } catch (error: any) {
      const message = getErrorMessage(error, "Failed to delete candidates");
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const resetCandidate = createAsyncThunk(
  "candidates/resetCandidate",
  async (
    { batchId, candidateId }: ResetCandidateInput,
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(
        `/batches/${batchId}/candidates/${candidateId}/reset`
      );
      toast.success("Candidate reset successfully.");
      return { candidateId, data: response.data };
    } catch (error: any) {
      const message = getErrorMessage(error, "Failed to reset candidate");
      toast.error(message);
      return rejectWithValue(message);
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

      // deleteCandidatesFromBatch
      .addCase(deleteCandidatesFromBatch.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(
        deleteCandidatesFromBatch.fulfilled,
        (state, action: PayloadAction<Array<string | number>>) => {
          state.deleting = false;
          const deletedSet = new Set(action.payload.map(String));
          state.candidates = state.candidates.filter(
            (c) => !deletedSet.has(String(c.id))
          );
          state.totalCandidates = state.candidates.length;
        }
      )
      .addCase(deleteCandidatesFromBatch.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      })

      // resetCandidate
      .addCase(resetCandidate.pending, (state) => {
        state.resetting = true;
        state.error = null;
      })
      .addCase(resetCandidate.fulfilled, (state) => {
        state.resetting = false;
      })
      .addCase(resetCandidate.rejected, (state, action) => {
        state.resetting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCandidatesError, clearCandidates, setSelectedBatchId } =
  candidatesSlice.actions;

export default candidatesSlice.reducer;
