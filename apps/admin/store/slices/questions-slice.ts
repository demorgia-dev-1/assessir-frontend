import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { Topic } from "@/store/slices/topics-slice";

export type QuestionType = "mcq" | "rubric";
export type DifficultyLevel = "easy" | "medium" | "hard";

export type McqOption = {
  text: string;
  is_correct: boolean;
};

export type RubricScore = {
  label: string;
  percentage: number;
};

export type QuestionMetadata =
  | {
      options?: McqOption[];
      scores?: RubricScore[];
    }
  | string
  | null;

export type Question = {
  id: string | number;
  text: string;
  type: QuestionType;
  difficultyLvl: DifficultyLevel;
  topicID: string | number;
  metadata: QuestionMetadata;
  topic?: Topic | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateQuestionInput = {
  text: string;
  type: QuestionType;
  difficulty_lvl: DifficultyLevel;
  topic_id: number;
  metadata: {
    options?: McqOption[];
    scores?: RubricScore[];
  };
};

export type UpdateQuestionInput = {
  id: string | number;
  text: string;
  type: QuestionType;
  difficultyLvl: DifficultyLevel;
  topicID: number;
  metadata: {
    options?: McqOption[];
    scores?: RubricScore[];
  };
};

export type GetQuestionsParams = {
  page?: number;
  limit?: number;
  type?: QuestionType;
  topicID?: string | number;
};

type QuestionApiShape = Partial<Question> & {
  difficulty_lvl?: DifficultyLevel;
  topic_id?: string | number;
  topicID?: string | number;
  metadata?: QuestionMetadata;
};

interface QuestionsState {
  questions: Question[];
  totalQuestions: number;
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
  selectedQuestion: Question | null;
  error: string | null;
}

const initialState: QuestionsState = {
  questions: [],
  totalQuestions: 0,
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
  selectedQuestion: null,
  error: null,
};

function parseMetadata(metadata: QuestionMetadata) {
  if (!metadata) {
    return null;
  }

  if (typeof metadata !== "string") {
    return metadata;
  }

  try {
    return JSON.parse(metadata);
  } catch {
    return metadata;
  }
}

function normalizeQuestion(question: QuestionApiShape): Question {
  return {
    id: question.id ?? "",
    text: question.text ?? "",
    type: (question.type ?? "mcq") as QuestionType,
    difficultyLvl: (question.difficultyLvl ??
      question.difficulty_lvl ??
      "easy") as DifficultyLevel,
    topicID: question.topicID ?? question.topic_id ?? 0,
    metadata: parseMetadata(question.metadata ?? null),
    topic: question.topic ?? null,
    created_at: question.created_at,
    updated_at: question.updated_at,
  };
}

function buildBulkCreatePayload(questions: CreateQuestionInput[]) {
  return {
    questions: questions.map((question) => ({
      text: question.text,
      type: question.type,
      difficulty_lvl: question.difficulty_lvl,
      topic_id: Number(question.topic_id),
      metadata: question.metadata,
    })),
  };
}

function buildUpdatePayload(question: UpdateQuestionInput) {
  return {
    difficultyLvl: question.difficultyLvl,
    metadata: question.metadata,  
    text: question.text,
    topicID: Number(question.topicID),
    type: question.type,
  };
}

export const fetchQuestions = createAsyncThunk(
  "questions/fetchQuestions",
  async (params: GetQuestionsParams = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/questions", { params });
      const data = response.data;
      if (Array.isArray(data)) {
        return { questions: data, total: data.length };
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to fetch questions"
      );
    }
  }
);

export const fetchQuestionById = createAsyncThunk(
  "questions/fetchQuestionById",
  async (id: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/questions/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to fetch question details"
      );
    }
  }
);

export const createQuestions = createAsyncThunk(
  "questions/createQuestions",
  async (questions: CreateQuestionInput[], { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/questions",
        buildBulkCreatePayload(questions)
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to create questions"
      );
    }
  }
);

export const updateQuestion = createAsyncThunk(
  "questions/updateQuestion",
  async (question: UpdateQuestionInput, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/questions/${question.id}`,
        buildUpdatePayload(question)
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to update question"
      );
    }
  }
);

export const deleteQuestion = createAsyncThunk(
  "questions/deleteQuestion",
  async (id: string | number, { rejectWithValue }) => {
    try {
      await api.delete(`/questions/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to delete question"
      );
    }
  }
);

const questionsSlice = createSlice({
  name: "questions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedQuestion: (state) => {
      state.selectedQuestion = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchQuestions.fulfilled,
        (
          state,
          action: PayloadAction<
            | {
                questions?: QuestionApiShape[];
                totalQuestions?: number;
                total?: number;
                totalPages?: number;
                page?: number;
                limit?: number;
                hasNext?: boolean;
                hasPrev?: boolean;
              }
            | QuestionApiShape[]
          >
        ) => {
          state.loading = false;
          if (Array.isArray(action.payload)) {
            state.questions = action.payload.map(normalizeQuestion);
            state.totalQuestions = state.questions.length;
            state.totalPages = 1;
            state.currentPage = 1;
            state.hasNext = false;
            state.hasPrev = false;
            return;
          }

          const payload = action.payload;
          state.questions = (payload.questions || []).map(normalizeQuestion);
          state.totalQuestions =
            payload.totalQuestions ?? payload.total ?? state.questions.length;
          state.totalPages = payload.totalPages ?? 1;
          state.currentPage = payload.page ?? 1;
          state.limit = payload.limit ?? 10;
          state.hasNext = payload.hasNext ?? state.currentPage < state.totalPages;
          state.hasPrev = payload.hasPrev ?? state.currentPage > 1;
        }
      )
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchQuestionById.pending, (state) => {
        state.viewLoading = true;
        state.error = null;
        state.selectedQuestion = null;
      })
      .addCase(
        fetchQuestionById.fulfilled,
        (state, action: PayloadAction<QuestionApiShape>) => {
          state.viewLoading = false;
          state.selectedQuestion = normalizeQuestion(action.payload);
        }
      )
      .addCase(fetchQuestionById.rejected, (state, action) => {
        state.viewLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createQuestions.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createQuestions.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createQuestions.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      .addCase(updateQuestion.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(
        updateQuestion.fulfilled,
        (state, action: PayloadAction<QuestionApiShape>) => {
          state.updating = false;
          const updatedQuestion = normalizeQuestion(action.payload);
          const index = state.questions.findIndex(
            (question) => question.id === updatedQuestion.id
          );
          if (index !== -1) {
            state.questions[index] = updatedQuestion;
          }
          if (state.selectedQuestion?.id === updatedQuestion.id) {
            state.selectedQuestion = updatedQuestion;
          }
        }
      )
      .addCase(updateQuestion.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      .addCase(deleteQuestion.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(
        deleteQuestion.fulfilled,
        (state, action: PayloadAction<string | number>) => {
          state.deleting = false;
          state.questions = state.questions.filter(
            (question) => question.id !== action.payload
          );
          state.totalQuestions = Math.max(0, state.totalQuestions - 1);
          if (state.selectedQuestion?.id === action.payload) {
            state.selectedQuestion = null;
          }
        }
      )
      .addCase(deleteQuestion.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedQuestion } = questionsSlice.actions;
export default questionsSlice.reducer;
