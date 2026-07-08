import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import Cookies from "js-cookie";

const AUTH_COOKIE_KEY = "candidate_token";
const BATCH_STORAGE_KEY = "candidate_exam_batch";
const STATUS_STORAGE_KEY = "candidate_exam_statuses";

export type CandidateSessionPayload = {
  enrollment_no?: string;
  batch_id?: number | string;
  exp?: number;
  iat?: number;
  role?: string;
  candidate_id?: number | string;
};

export type ExamStatuses = {
  theory: string | null;
  practical: string | null;
  viva: string | null;
};

type AuthState = {
  batch: any | null;
  examStatuses: ExamStatuses | null;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  session: CandidateSessionPayload | null;
  token: string | null;
};

const initialState: AuthState = {
  batch: null,
  examStatuses: null,
  error: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  session: null,
  token: null
};

function extractExamStatuses(data: any): ExamStatuses {
  return {
    theory: data?.theory_exam_status ?? null,
    practical: data?.practical_exam_status ?? null,
    viva: data?.viva_exam_status ?? null
  };
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  return atob(padded);
}

function parseJwt(token: string): CandidateSessionPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload)) as CandidateSessionPayload;
  } catch {
    return null;
  }
}

export const initializeAuth = createAsyncThunk("auth/initialize", async () => {
  const token = Cookies.get(AUTH_COOKIE_KEY);
  const session = token ? parseJwt(token) : null;

  if (!token || !session) {
    Cookies.remove(AUTH_COOKIE_KEY);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(BATCH_STORAGE_KEY);
      sessionStorage.removeItem(STATUS_STORAGE_KEY);
    }
    return {
      batch: null,
      examStatuses: null,
      isAuthenticated: false,
      session: null,
      token: null
    };
  }

  // Restore batch data and exam statuses from sessionStorage
  let batch: any = null;
  let examStatuses: ExamStatuses | null = null;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(BATCH_STORAGE_KEY);
      if (stored) batch = JSON.parse(stored);
    } catch {}
    try {
      const storedStatuses = sessionStorage.getItem(STATUS_STORAGE_KEY);
      if (storedStatuses) examStatuses = JSON.parse(storedStatuses);
    } catch {}
  }

  return {
    batch,
    examStatuses,
    isAuthenticated: true,
    session,
    token
  };
});

export const loginCandidateAction = createAsyncThunk<
  {
    batch: any | null;
    examStatuses: ExamStatuses;
    session: CandidateSessionPayload | null;
    token: string;
  },
  { batchId: string; enrollment_no: string; password: string },
  { rejectValue: string }
>("auth/loginCandidate", async ({ batchId, enrollment_no, password }, { rejectWithValue }) => {
  try {
    const response = await api.post(`/batches/${batchId}/exam/login`, {
      enrollment_no,
      password
    });

    const data = response.data;
    const token = data.token || data; // Handle both object and string response

    if (typeof token !== "string") {
      throw new Error("Invalid token received from server");
    }

    Cookies.set(AUTH_COOKIE_KEY, token, { expires: 1 }); // Set cookie for 1 day
    const session = parseJwt(token);

    // Persist batch details and exam statuses to sessionStorage
    const batch = data.batch || null;
    const examStatuses = extractExamStatuses(data);
    if (typeof window !== "undefined") {
      if (batch) {
        sessionStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batch));
      }
      sessionStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(examStatuses));
    }

    return {
      batch,
      examStatuses,
      session,
      token
    };
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || error.response?.data?.message || error.message || "Unable to sign in right now."
    );
  }
});

export const logoutCandidateAction = createAsyncThunk("auth/logoutCandidate", async () => {
  Cookies.remove(AUTH_COOKIE_KEY);
  if (typeof window !== "undefined") {
    localStorage.removeItem("candidate_user");
    sessionStorage.removeItem("candidate_user");
    sessionStorage.removeItem(BATCH_STORAGE_KEY);
    sessionStorage.removeItem(STATUS_STORAGE_KEY);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    setSession(state, action: PayloadAction<CandidateSessionPayload | null>) {
      state.session = action.payload;
      state.isAuthenticated = Boolean(action.payload && state.token);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.batch = action.payload.batch;
        state.examStatuses = action.payload.examStatuses;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.session = action.payload.session;
        state.token = action.payload.token;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.batch = null;
        state.examStatuses = null;
        state.isAuthenticated = false;
        state.session = null;
        state.token = null;
      })
      .addCase(loginCandidateAction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginCandidateAction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.batch = action.payload.batch;
        state.examStatuses = action.payload.examStatuses;
        state.session = action.payload.session;
        state.token = action.payload.token;
      })
      .addCase(loginCandidateAction.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload ?? "Unable to sign in right now.";
      })
      .addCase(logoutCandidateAction.fulfilled, (state) => {
        state.batch = null;
        state.examStatuses = null;
        state.error = null;
        state.isAuthenticated = false;
        state.session = null;
        state.token = null;
      });
  }
});

export const { clearAuthError, setSession } = authSlice.actions;
export default authSlice.reducer;
