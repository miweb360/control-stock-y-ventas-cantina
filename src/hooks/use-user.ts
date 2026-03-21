"use client";

import useSWR from "swr";

export interface User {
  id: number;
  email: string;
  role: "ADMIN" | "SELLER";
}

const fetcher = async (url: string): Promise<User> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const error = new Error("No autorizado");
    throw error;
  }
  const data = await res.json();
  return data.user;
};

export function useUser() {
  const { data: user, error, isLoading, mutate } = useSWR<User>(
    "/api/v1/auth/me",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    user,
    isLoading,
    isError: error,
    isAuthenticated: !!user && !error,
    mutate,
  };
}
