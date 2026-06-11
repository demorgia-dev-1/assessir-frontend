import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

export type BatchSectionType = "theory" | "practical" | "viva";
export type BatchDifficultyLevel = "easy" | "medium" | "hard";
export type BatchQuestionType = "mcq" | "rubric";

export type BatchCandidate = {
  id?: string | number;
  enrollment_no: string;
  password: string;
  batch_id?: string | number;
  created_at?: string;
  updated_at?: string;
};

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
  jobRole?: any;
  job_role?: any;
  jobrole?: any;
  theory_test?: any;
  practical_test?: any;
  viva_test?: any;
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

export type SetSlotInput = {
  batchId: string | number;
  testType: "THEORY" | "PRACTICAL" | "VIVA";
  startDateTime: string; // ISO format string (e.g., "2026-06-15T10:00:00Z")
  endDateTime: string; // ISO format string (e.g., "2026-06-15T10:30:00Z")
};

type BatchApiShape = Partial<Batch> & {
  jobRoleID?: string | number;
  job_role_id?: string | number;
  jobrole_id?: string | number;
  theory_test_id?: string | number;
  practical_test_id?: string | number;
  viva_test_id?: string | number;
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
  batchCandidates: BatchCandidate[];
  candidatesLoading: boolean;
  candidatesError: string | null;
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
  batchCandidates: [],
  candidatesLoading: false,
  candidatesError: null,
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
  let sections = batch.sections ?? [];
  if (
    (!sections || sections.length === 0) &&
    (batch.theory_test || batch.practical_test || batch.viva_test)
  ) {
    const reconstructed: BatchSectionPayload[] = [];

    const parseTest = (test: any, type: BatchSectionType) => {
      if (!test || !Array.isArray(test.sections)) return;
      test.sections.forEach((sec: any) => {
        const groups: Record<string, BatchNosPayload> = {};
        (sec.questions || []).forEach((q: any) => {
          const nosCode = q.nos?.code || q.nos?.nos_code || q.nos_code || "";
          const topicId = Number(q.topic_id || q.topic?.id || 0);
          const difficulty = (q.difficulty_lvl ||
            "easy") as BatchDifficultyLevel;
          const qType = (q.type || "mcq") as BatchQuestionType;
          const correctMark = Number(q.correct_mark ?? 0);
          const negativeMark = Number(q.negative_mark ?? 0);

          const key = `${nosCode}_${topicId}_${difficulty}_${qType}_${correctMark}_${negativeMark}`;
          if (!groups[key]) {
            groups[key] = {
              topic_id: topicId,
              nos_code: nosCode,
              question_count: 0,
              difficulty_lvl: difficulty,
              question_type: qType,
              correct_mark: correctMark,
              negative_mark: negativeMark,
              pc_list: [],
            };
          }
          groups[key].question_count += 1;
        });

        const nosList = Object.values(groups);
        if (nosList.length > 0) {
          reconstructed.push({
            name:
              sec.Name ||
              sec.name ||
              `${type.charAt(0).toUpperCase()}${type.slice(1)} Section`,
            type,
            nos_list: nosList,
          });
        }
      });
    };

    parseTest(batch.theory_test, "theory");
    parseTest(batch.practical_test, "practical");
    parseTest(batch.viva_test, "viva");

    if (reconstructed.length > 0) {
      sections = reconstructed;
    }
  }

  return {
    ...batch,
    id: batch.id ?? "",
    name: batch.name ?? "",
    job_role_id: Number(
      batch.job_role_id ?? batch.jobrole_id ?? batch.jobRoleID ?? 0
    ),
    sections,
    jobRole: batch.jobRole ?? batch.job_role ?? batch.jobrole ?? null,
  };
}

export const setBatchSlot = createAsyncThunk(
  "batches/setBatchSlot",
  async ({ batchId, ...payload }: SetSlotInput, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/batches/${batchId}/set-slot`, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to set slot configuration")
      );
    }
  }
);

export const publishBatch = createAsyncThunk(
  "batches/publishBatch",
  async (batchId: string | number, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/batches/${batchId}/publish`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to publish batch"));
    }
  }
);

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
      console.log(JSON.stringify(batches, null, 2));
      const response = await api.post("/batches", batches);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to create batches")
      );
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

export const fetchBatchCandidates = createAsyncThunk(
  "batches/fetchBatchCandidates",
  async (batchId: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/batches/${batchId}/candidates`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch candidates")
      );
    }
  }
);

export const createBatchCandidates = createAsyncThunk(
  "batches/createBatchCandidates",
  async (
    {
      batchId,
      candidates,
    }: {
      batchId: string | number;
      candidates: Array<{ enrollment_no: string; password: string }>;
    },
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
          state.hasNext =
            payload.hasNext ?? state.currentPage < state.totalPages;
          state.hasPrev = payload.hasPrev ?? state.currentPage > 1;
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
      .addCase(
        fetchBatchById.fulfilled,
        (state, action: PayloadAction<BatchApiShape>) => {
          state.viewLoading = false;
          state.selectedBatch = normalizeBatch(action.payload);
        }
      )
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
      .addCase(
        updateBatch.fulfilled,
        (state, action: PayloadAction<BatchApiShape>) => {
          state.updating = false;
          const updatedBatch = normalizeBatch(action.payload);
          const index = state.batches.findIndex(
            (batch) => batch.id === updatedBatch.id
          );
          if (index !== -1) {
            state.batches[index] = updatedBatch;
          }
          if (state.selectedBatch?.id === updatedBatch.id) {
            state.selectedBatch = updatedBatch;
          }
        }
      )
      .addCase(updateBatch.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      .addCase(deleteBatch.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(
        deleteBatch.fulfilled,
        (state, action: PayloadAction<string | number>) => {
          state.deleting = false;
          state.batches = state.batches.filter(
            (batch) => batch.id !== action.payload
          );
          state.totalBatches = Math.max(0, state.totalBatches - 1);
          if (state.selectedBatch?.id === action.payload) {
            state.selectedBatch = null;
          }
        }
      )
      .addCase(deleteBatch.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBatchCandidates.pending, (state) => {
        state.candidatesLoading = true;
        state.candidatesError = null;
        state.batchCandidates = [];
      })
      .addCase(
        fetchBatchCandidates.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.candidatesLoading = false;
          const data = action.payload;
          if (Array.isArray(data)) {
            state.batchCandidates = data;
          } else if (data && Array.isArray(data.candidates)) {
            state.batchCandidates = data.candidates;
          } else {
            state.batchCandidates = [];
          }
        }
      )
      .addCase(fetchBatchCandidates.rejected, (state, action) => {
        state.candidatesLoading = false;
        state.candidatesError = action.payload as string;
      })
      .addCase(createBatchCandidates.pending, (state) => {
        state.candidatesLoading = true;
        state.candidatesError = null;
      })
      .addCase(createBatchCandidates.fulfilled, (state) => {
        state.candidatesLoading = false;
      })
      .addCase(createBatchCandidates.rejected, (state, action) => {
        state.candidatesLoading = false;
        state.candidatesError = action.payload as string;
      })
      // Handle setBatchSlot status updates
      .addCase(setBatchSlot.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(
        setBatchSlot.fulfilled,
        (state, action: PayloadAction<BatchApiShape>) => {
          state.updating = false;
          if (action.payload && action.payload.id) {
            const updatedBatch = normalizeBatch(action.payload);
            const index = state.batches.findIndex(
              (batch) => batch.id === updatedBatch.id
            );
            if (index !== -1) {
              state.batches[index] = updatedBatch;
            }
            if (state.selectedBatch?.id === updatedBatch.id) {
              state.selectedBatch = updatedBatch;
            }
          }
        }
      )
      .addCase(setBatchSlot.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      // Handle publishBatch status updates
      .addCase(publishBatch.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(
        publishBatch.fulfilled,
        (state, action: PayloadAction<BatchApiShape>) => {
          state.updating = false;
          if (action.payload && action.payload.id) {
            const updatedBatch = normalizeBatch(action.payload);
            const index = state.batches.findIndex(
              (batch) => batch.id === updatedBatch.id
            );
            if (index !== -1) {
              state.batches[index] = updatedBatch;
            }
            if (state.selectedBatch?.id === updatedBatch.id) {
              state.selectedBatch = updatedBatch;
            }
          }
        }
      )
      .addCase(publishBatch.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBatchError, clearSelectedBatch } = batchesSlice.actions;
export default batchesSlice.reducer;
