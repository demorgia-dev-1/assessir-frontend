import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/store/slices/auth-slice";
import sectorReducer from "@/store/slices/sector-slice";
import usersReducer from "@/store/slices/users-slice";
import teamsReducer from "@/store/slices/teams-slice";
import jobRoleReducer from "@/store/slices/jobrole-slice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      sectors: sectorReducer,
      users: usersReducer,
      teams: teamsReducer,
      jobRoles: jobRoleReducer
    }
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
