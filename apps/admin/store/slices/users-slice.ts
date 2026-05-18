import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

export type User = {
  id: string | number;
  email: string;
  name: string;
  role: string; // e.g. "admin" | "assessor" | "candidate"
  created_at?: string;
  updated_at?: string;
};

export type CreateUserInput = {
  email: string;
  name: string;
  password?: string;
  role: string;
};

export type GetUsersParams = {
  page?: number;
  limit?: number;
  name?: string;
  role?: string;
};

interface UsersState {
  users: User[];
  totalUsers: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  loading: boolean;
  creating: boolean;
  viewLoading: boolean;
  selectedUser: User | null;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  totalUsers: 0,
  totalPages: 0,
  currentPage: 1,
  limit: 10,
  hasNext: false,
  hasPrev: false,
  loading: false,
  creating: false,
  viewLoading: false,
  selectedUser: null,
  error: null,
};

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (params: GetUsersParams = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/users", { params });
      const data = response.data;
      if (Array.isArray(data)) {
        return { users: data, total: data.length };
      }
      return data; // Expected formats: { users: [], totalUsers: 0, totalPages: 1, ... }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch users");
    }
  }
);

export const fetchUserById = createAsyncThunk(
  "users/fetchUserById",
  async (id: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch user details");
    }
  }
);

export const createUser = createAsyncThunk(
  "users/createUser",
  async (data: CreateUserInput, { rejectWithValue }) => {
    try {
      const response = await api.post("/users", data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to create user");
    }
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<{
        users: User[];
        totalUsers?: number;
        total?: number;
        totalPages?: number;
        page?: number;
        limit?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
      } | User[]>) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.users = action.payload;
          state.totalUsers = action.payload.length;
          state.totalPages = 1;
          state.currentPage = 1;
          state.hasNext = false;
          state.hasPrev = false;
        } else {
          const payload = action.payload;
          state.users = payload.users || [];
          state.totalUsers = payload.totalUsers ?? payload.total ?? (payload.users?.length || 0);
          state.totalPages = payload.totalPages ?? 1;
          state.currentPage = payload.page ?? 1;
          state.limit = payload.limit ?? 10;
          state.hasNext = payload.hasNext ?? false;
          state.hasPrev = payload.hasPrev ?? false;
        }
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch User by ID
      .addCase(fetchUserById.pending, (state) => {
        state.viewLoading = true;
        state.error = null;
        state.selectedUser = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action: PayloadAction<User>) => {
        state.viewLoading = false;
        state.selectedUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.viewLoading = false;
        state.error = action.payload as string;
      })
      // Create User
      .addCase(createUser.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.creating = false;
        const newUser = {
          ...action.payload,
          created_at: action.payload.created_at || new Date().toISOString()
        };
        state.users.unshift(newUser);
        state.totalUsers += 1;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedUser } = usersSlice.actions;
export default usersSlice.reducer;
