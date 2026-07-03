import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import api from "@/lib/api";

export interface BatchReport {
  [key: string]: any;
}

interface ReportsState {
  report: BatchReport | null;
  loading: boolean;
  error: string | null;
  selectedBatchId: string | number | null;
}

const initialState: ReportsState = {
  report: null,
  loading: false,
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
        message = Array.isArray(parsed.errors)
          ? parsed.errors.join(", ")
          : Object.values(parsed.errors).flat().join(", ");
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

export const fetchBatchReport = createAsyncThunk(
  "reports/fetchBatchReport",
  async (batchId: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/batches/${batchId}/report`);
      return { batchId, data: response.data };
    } catch (error: any) {
      const message = getErrorMessage(error, "Failed to fetch batch report");
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    clearReport: (state) => {
      state.report = null;
      state.error = null;
      state.selectedBatchId = null;
    },
    setReportBatchId: (
      state,
      action: PayloadAction<string | number | null>
    ) => {
      state.selectedBatchId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatchReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchBatchReport.fulfilled,
        (
          state,
          action: PayloadAction<{ batchId: string | number; data: any }>
        ) => {
          state.loading = false;
          state.selectedBatchId = action.payload.batchId;
          state.report = action.payload.data ?? null;
        }
      )
      .addCase(fetchBatchReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.report = null;
      });
  },
});

export const { clearReport, setReportBatchId } = reportsSlice.actions;
export default reportsSlice.reducer;
