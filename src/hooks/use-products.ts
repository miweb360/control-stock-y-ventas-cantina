"use client";

import useSWR from "swr";

export interface Product {
  id: number;
  name: string;
  barcode: string | null;
  salePrice: number;
  currentStock: number;
  minStock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const fetcher = async (url: string): Promise<Product[]> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Error al cargar productos");
  }
  return res.json();
};

export function useProducts(activeOnly = true) {
  const { data: products, error, isLoading, mutate } = useSWR<Product[]>(
    `/api/v1/products${activeOnly ? "?active=true" : ""}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    products: products ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}
