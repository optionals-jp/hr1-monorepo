"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ProductProvider } from "@/lib/product-context";
import type { Product } from "@/lib/product";
import { TooltipProvider } from "@hr1/shared-ui/components/ui/tooltip";
import { ToastProvider } from "@hr1/shared-ui/components/ui/toast";

export function ClientLayout({ product, children }: { product: Product; children: ReactNode }) {
  return (
    <ProductProvider product={product}>
      <TooltipProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </TooltipProvider>
    </ProductProvider>
  );
}
