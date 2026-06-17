"use client";

import { ReactNode, useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore } from "@/store";
import { initializeAuth } from "@/store/slices/auth-slice";

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    storeRef.current?.dispatch(initializeAuth());
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
