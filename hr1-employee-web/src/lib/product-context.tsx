"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { type Product, detectProduct } from "./product";

const ProductContext = createContext<Product>("working");

function getProductSnapshot(): Product {
  return detectProduct(window.location.hostname, window.location.search);
}

function getProductServerSnapshot(): Product {
  return "working";
}

function subscribe() {
  return () => {};
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const product = useSyncExternalStore(subscribe, getProductSnapshot, getProductServerSnapshot);

  return <ProductContext.Provider value={product}>{children}</ProductContext.Provider>;
}

export function useProduct(): Product {
  return useContext(ProductContext);
}
