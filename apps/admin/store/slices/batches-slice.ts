import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

export type BatchSectionType = "theory" | "practical" | "viva";
export type BatchDifficultyLevel = "easy" | "medium" | "hard";
export type BatchQuestionType = "mcq" | "rubric";

export type BatchPcPayload = {
  topic_id: number;
  nos_code: string;
  pc_code: string;
  question_count: number;
  difficulty_lvl: BatchDifficultyLevel;
  question_type: BatchQuestionType;
  correct_mark: number;
  negative_mark: number;
};

export type BatchNosPayload = {
  topic_id: number;
  nos_code: string;
  question_count: number;
  difficulty_lvl: BatchDifficultyLevel;
  question_type: BatchQuestionType;
  correct_mark: number;
  negative_mark: number;
  pc_list: BatchPcPayload[];
};

export type BatchSectionPayload = {
  name: string;
  type: BatchSectionType;
  nos_list: BatchNosPayload[];
};

export type BatchPayload = {
  name: string;
  job_role_id: number;
  theory_time: number;
  practical_time: number;
  viva_time: number;
  sections: BatchSectionPayload[];
};

export type Batch = Partial<BatchPayload> & {
  id: string | number;
  jobRole?: {
    id: string | number;
    name: string;
  } | null;
  job_role?: {
    id: string | number;
    name: string;
  } | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateBatchesInput = BatchPayload[];
export type UpdateBatchInput = Partial<BatchPayload> & {
  id: string | number;
};

export type GetBatchesParams = {
  page?: number;
  limit?: number;
  name?: string;
  job_role_id?: string | number;
};

type BatchApiShape = Partial<Batch> & {
  jobRoleID?: string | number;
  job_role_id?: string | number;
};

interface BatchesState {
  batches: Batch[];
  totalBatches: number;
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
  selectedBatch: Batch | null;
  error: string | null;
}

const initialState: BatchesState = {
  batches: [],
  totalBatches: 0,
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
  selectedBatch: null,
  error: null,
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
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  return typeof message === "string" ? message : String(message);
}

function normalizeBatch(batch: BatchApiShape): Batch {
  return {
    ...batch,
    id: batch.id ?? "",
    name: batch.name ?? "",
    job_role_id: Number(batch.job_role_id ?? batch.jobRoleID ?? 0),
    theory_time: Number(batch.theory_time ?? 0),
    practical_time: Number(batch.practical_time ?? 0),
    viva_time: Number(batch.viva_time ?? 0),
    sections: batch.sections ?? [],
    jobRole: batch.jobRole ?? batch.job_role ?? null,
  };
}

export const fetchBatches = createAsyncThunk(
  "batches/fetchBatches",
  async (params: GetBatchesParams = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/batches", { params });
      const data = response.data;
      if (Array.isArray(data)) {
        return { batches: data, total: data.length };
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch batches"));
    }
  }
);

export const fetchBatchById = createAsyncThunk(
  "batches/fetchBatchById",
  async (id: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/batches/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch batch details")
      );
    }
  }
);

export const createBatches = createAsyncThunk(
  "batches/createBatches",
  async (batches: CreateBatchesInput, { rejectWithValue }) => {
    try {
      console.log( JSON.stringify(batches, null, 2))
      const response = await api.post("/batches", batches);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to create batches"));
    }
  }
);

export const updateBatch = createAsyncThunk(
  "batches/updateBatch",
  async ({ id, ...payload }: UpdateBatchInput, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/batches/${id}`, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to update batch"));
    }
  }
);

export const deleteBatch = createAsyncThunk(
  "batches/deleteBatch",
  async (id: string | number, { rejectWithValue }) => {
    try {
      await api.delete(`/batches/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to delete batch"));
    }
  }
);

const batchesSlice = createSlice({
  name: "batches",
  initialState,
  reducers: {
    clearBatchError: (state) => {
      state.error = null;
    },
    clearSelectedBatch: (state) => {
      state.selectedBatch = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchBatches.fulfilled,
        (
          state,
          action: PayloadAction<
            | {
                batches?: BatchApiShape[];
                totalBatches?: number;
                total?: number;
                totalPages?: number;
                page?: number;
                limit?: number;
                hasNext?: boolean;
                hasPrev?: boolean;
              }
            | BatchApiShape[]
          >
        ) => {
          state.loading = false;
          if (Array.isArray(action.payload)) {
            state.batches = action.payload.map(normalizeBatch);
            state.totalBatches = state.batches.length;
            state.totalPages = 1;
            state.currentPage = 1;
            state.hasNext = false;
            state.hasPrev = false;
            return;
          }

          const payload = action.payload;
          state.batches = (payload.batches || []).map(normalizeBatch);
          state.totalBatches =
            payload.totalBatches ?? payload.total ?? state.batches.length;
          state.totalPages = payload.totalPages ?? 1;
          state.currentPage = payload.page ?? 1;
          state.limit = payload.limit ?? 10;
          state.hasNext = payload.hasNext ?? false;
          state.hasPrev = payload.hasPrev ?? false;
        }
      )
      .addCase(fetchBatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBatchById.pending, (state) => {
        state.viewLoading = true;
        state.error = null;
        state.selectedBatch = null;
      })
      .addCase(fetchBatchById.fulfilled, (state, action: PayloadAction<BatchApiShape>) => {
        state.viewLoading = false;
        state.selectedBatch = normalizeBatch(action.payload);
      })
      .addCase(fetchBatchById.rejected, (state, action) => {
        state.viewLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createBatches.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createBatches.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createBatches.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      .addCase(updateBatch.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateBatch.fulfilled, (state, action: PayloadAction<BatchApiShape>) => {
        state.updating = false;
        const updatedBatch = normalizeBatch(action.payload);
        const index = state.batches.findIndex((batch) => batch.id === updatedBatch.id);
        if (index !== -1) {
          state.batches[index] = updatedBatch;
        }
        if (state.selectedBatch?.id === updatedBatch.id) {
          state.selectedBatch = updatedBatch;
        }
      })
      .addCase(updateBatch.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      .addCase(deleteBatch.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteBatch.fulfilled, (state, action: PayloadAction<string | number>) => {
        state.deleting = false;
        state.batches = state.batches.filter((batch) => batch.id !== action.payload);
        state.totalBatches = Math.max(0, state.totalBatches - 1);
        if (state.selectedBatch?.id === action.payload) {
          state.selectedBatch = null;
        }
      })
      .addCase(deleteBatch.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBatchError, clearSelectedBatch } = batchesSlice.actions;
export default batchesSlice.reducer;
