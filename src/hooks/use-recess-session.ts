"use client";

import useSWR from "swr";

export interface SessionItem {
  id: string;
  productId: string;
  productName: string;
  barcode: string | null;
  qty: number;
  unitPriceRef: number;
  lineTotal: number;
  createdAt: string;
}

export interface RecessSession {
  id: string;
  status: string;
  openedAt: string;
  items: SessionItem[];
}

const fetcher = async (url: string): Promise<RecessSession | null> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Error al cargar sesion");
  }
  const data = await res.json();
  return data.session;
};

export function useRecessSession() {
  const { data: session, error, isLoading, mutate } = useSWR<RecessSession | null>(
    "/api/v1/recess-sessions?current=1",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds
      refreshInterval: 0, // No auto-refresh, we manually mutate
    }
  );

  return {
    session,
    isLoading,
    isError: error,
    mutate,
  };
}
