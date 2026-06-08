import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/store/slices/auth-slice";
import sectorReducer from "@/store/slices/sectors-slice";
import usersReducer from "@/store/slices/users-slice";
import teamsReducer from "@/store/slices/teams-slice";
import jobRoleReducer from "@/store/slices/jobroles-slice";
import topicReducer from "@/store/slices/topics-slice";
import questionsReducer from "@/store/slices/questions-slice";
import batchesReducer from "@/store/slices/batches-slice";
import groupsReducer from "@/store/slices/groups-slice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      sectors: sectorReducer,
      users: usersReducer,
      teams: teamsReducer,
      jobRoles: jobRoleReducer,
      topics: topicReducer,
      questions: questionsReducer,
      batches: batchesReducer,
      groups: groupsReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
