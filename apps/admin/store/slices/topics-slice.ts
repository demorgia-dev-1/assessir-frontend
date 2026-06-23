import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

export type Topic = {
  id: string | number;
  name: string;
  created_at?: string;
  updated_at?: string;
};

export type CreateTopicInput = {
  name: string;
};

export type UpdateTopicInput = {
  id: string | number;
  name: string;
};

export type GetTopicsParams = {
  page?: number;
  limit?: number;
  name?: string;
};

interface TopicState {
  topics: Topic[];
  totalTopics: number;
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
  selectedTopic: Topic | null;
  error: string | null;
}

const initialState: TopicState = {
  topics: [],
  totalTopics: 0,
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
  selectedTopic: null,
  error: null,
};

export const fetchTopics = createAsyncThunk(
  "topics/fetchTopics",
  async (params: GetTopicsParams = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/topics", { params });
      const data = response.data;
      if (Array.isArray(data)) {
        return { topics: data, total: data.length };
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to fetch topics");
    }
  }
);

export const fetchTopicById = createAsyncThunk(
  "topics/fetchTopicById",
  async (id: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/topics/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to fetch topic details");
    }
  }
);

export const createTopic = createAsyncThunk(
  "topics/createTopic",
  async (data: CreateTopicInput, { rejectWithValue }) => {
    try {
      const response = await api.post("/topics", data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to create topic");
    }
  }
);

export const updateTopic = createAsyncThunk(
  "topics/updateTopic",
  async ({ id, name }: UpdateTopicInput, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/topics/${id}`, { name });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to update topic");
    }
  }
);

export const deleteTopic = createAsyncThunk(
  "topics/deleteTopic",
  async (id: string | number, { rejectWithValue }) => {
    try {
      await api.delete(`/topics/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to delete topic");
    }
  }
);

const topicSlice = createSlice({
  name: "topics",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedTopic: (state) => {
      state.selectedTopic = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTopics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTopics.fulfilled, (state, action: PayloadAction<{
        topics?: Topic[];
        totalTopics?: number;
        total?: number;
        totalPages?: number;
        page?: number;
        limit?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
      } | Topic[]>) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.topics = action.payload;
          state.totalTopics = action.payload.length;
          state.totalPages = 1;
          state.currentPage = 1;
          state.hasNext = false;
          state.hasPrev = false;
        } else {
          const payload = action.payload;
          state.topics = payload.topics || [];
          state.totalTopics = payload.totalTopics ?? payload.total ?? state.topics.length;
          state.totalPages = payload.totalPages ?? 1;
          state.currentPage = payload.page ?? 1;
          state.limit = payload.limit ?? 10;
          state.hasNext = payload.hasNext ?? state.currentPage < state.totalPages;
          state.hasPrev = payload.hasPrev ?? state.currentPage > 1;
        }
      })
      .addCase(fetchTopics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTopicById.pending, (state) => {
        state.viewLoading = true;
        state.error = null;
        state.selectedTopic = null;
      })
      .addCase(fetchTopicById.fulfilled, (state, action: PayloadAction<Topic>) => {
        state.viewLoading = false;
        state.selectedTopic = action.payload;
      })
      .addCase(fetchTopicById.rejected, (state, action) => {
        state.viewLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createTopic.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createTopic.fulfilled, (state, action: PayloadAction<Topic>) => {
        state.creating = false;
        const newTopic = {
          ...action.payload,
          created_at: action.payload.created_at || new Date().toISOString(),
        };
        state.topics.unshift(newTopic);
        state.totalTopics += 1;
      })
      .addCase(createTopic.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      .addCase(updateTopic.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateTopic.fulfilled, (state, action: PayloadAction<Topic>) => {
        state.updating = false;
        const index = state.topics.findIndex((topic) => topic.id === action.payload.id);
        if (index !== -1) {
          state.topics[index] = action.payload;
        }
        if (state.selectedTopic?.id === action.payload.id) {
          state.selectedTopic = action.payload;
        }
      })
      .addCase(updateTopic.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      .addCase(deleteTopic.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteTopic.fulfilled, (state, action: PayloadAction<string | number>) => {
        state.deleting = false;
        state.topics = state.topics.filter((topic) => topic.id !== action.payload);
        state.totalTopics = Math.max(0, state.totalTopics - 1);
        if (state.selectedTopic?.id === action.payload) {
          state.selectedTopic = null;
        }
      })
      .addCase(deleteTopic.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedTopic } = topicSlice.actions;
export default topicSlice.reducer;
