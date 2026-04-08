"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Product } from "./product";

const ProductContext = createContext<Product>("working");

export function ProductProvider({ product, children }: { product: Product; children: ReactNode }) {
  return <ProductContext.Provider value={product}>{children}</ProductContext.Provider>;
}

export function useProduct(): Product {
  return useContext(ProductContext);
}
