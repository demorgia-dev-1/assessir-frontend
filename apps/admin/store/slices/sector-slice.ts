import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

export type Sector = {
  id: string | number;
  name: string;
  created_at?: string;
  updated_at?: string;
};

export type CreateSectorInput = {
  name: string;
};

export type GetSectorsParams = {
  page?: number;
  limit?: number;
  name?: string;
  sector_ids?: string;
};

interface SectorState {
  sectors: Sector[];
  totalSectors: number;
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
  selectedSector: Sector | null;
  error: string | null;
}

const initialState: SectorState = {
  sectors: [],
  totalSectors: 0,
  totalPages: 0,
  currentPage: 1,
  limit: 20,
  hasNext: false,
  hasPrev: false,
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  viewLoading: false,
  selectedSector: null,
  error: null,
};

export const fetchSectors = createAsyncThunk(
  "sectors/fetchSectors",
  async (params: GetSectorsParams = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/sectors", { params });
      const data = response.data;
      if (Array.isArray(data)) {
        return { sectors: data, total: data.length };
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to fetch sectors");
    }
  }
);

export const fetchSectorById = createAsyncThunk(
  "sectors/fetchSectorById",
  async (id: string | number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/sectors/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to fetch sector details");
    }
  }
);

export const createSector = createAsyncThunk(
  "sectors/createSector",
  async (data: CreateSectorInput, { rejectWithValue }) => {
    try {
      const response = await api.post("/sectors", data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to create sector");
    }
  }
);

export const updateSector = createAsyncThunk(
  "sectors/updateSector",
  async ({ id, name }: { id: string | number; name: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/sectors/${id}`, { name });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to update sector");
    }
  }
);

export const deleteSector = createAsyncThunk(
  "sectors/deleteSector",
  async (id: string | number, { rejectWithValue }) => {
    try {
      await api.delete(`/sectors/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || "Failed to delete sector");
    }
  }
);

const sectorSlice = createSlice({
  name: "sectors",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedSector: (state) => {
      state.selectedSector = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Sectors
      .addCase(fetchSectors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSectors.fulfilled, (state, action: PayloadAction<{ 
        sectors: Sector[]; 
        totalSectors: number; 
        totalPages: number;
        page: number;
        limit: number;
        hasNext: boolean;
        hasPrev: boolean;
      } | Sector[]>) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.sectors = action.payload;
          state.totalSectors = action.payload.length;
          state.totalPages = 1;
          state.currentPage = 1;
          state.hasNext = false;
          state.hasPrev = false;
        } else {
          state.sectors = action.payload.sectors;
          state.totalSectors = action.payload.totalSectors;
          state.totalPages = action.payload.totalPages;
          state.currentPage = action.payload.page;
          state.limit = action.payload.limit;
          state.hasNext = action.payload.hasNext;
          state.hasPrev = action.payload.hasPrev;
        }
      })
      .addCase(fetchSectors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Sector By ID
      .addCase(fetchSectorById.pending, (state) => {
        state.viewLoading = true;
        state.error = null;
        state.selectedSector = null;
      })
      .addCase(fetchSectorById.fulfilled, (state, action: PayloadAction<Sector>) => {
        state.viewLoading = false;
        state.selectedSector = action.payload;
      })
      .addCase(fetchSectorById.rejected, (state, action) => {
        state.viewLoading = false;
        state.error = action.payload as string;
      })
      // Create Sector
      .addCase(createSector.pending, (state) => {
        state.creating = true;
      })
      .addCase(createSector.fulfilled, (state, action: PayloadAction<Sector>) => {
        state.creating = false;
        const newSector = {
          ...action.payload,
          created_at: action.payload.created_at || new Date().toISOString()
        };
        state.sectors.unshift(newSector);
        state.totalSectors += 1;
      })
      .addCase(createSector.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      // Update Sector
      .addCase(updateSector.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateSector.fulfilled, (state, action: PayloadAction<Sector>) => {
        state.updating = false;
        const index = state.sectors.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.sectors[index] = action.payload;
        }
        if (state.selectedSector?.id === action.payload.id) {
          state.selectedSector = action.payload;
        }
      })
      .addCase(updateSector.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      // Delete Sector
      .addCase(deleteSector.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteSector.fulfilled, (state, action: PayloadAction<string | number>) => {
        state.deleting = false;
        state.sectors = state.sectors.filter(s => s.id !== action.payload);
        state.totalSectors = Math.max(0, state.totalSectors - 1);
        if (state.selectedSector?.id === action.payload) {
          state.selectedSector = null;
        }
      })
      .addCase(deleteSector.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedSector } = sectorSlice.actions;
export default sectorSlice.reducer;
