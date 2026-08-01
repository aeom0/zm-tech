// ============================================================
// Vista completa del storefront — compone header, catálogo y CTA
// ============================================================

import type { StorePublic, ProductPublic } from "@/types/storefront";
import { StorefrontHeader } from "./StorefrontHeader";
import { ProductCatalog } from "./ProductCatalog";
import { ContactCTA } from "./ContactCTA";

interface StorefrontViewProps {
  store: StorePublic;
  initialProducts: ProductPublic[];
  total: number;
}

export function StorefrontView({ store, initialProducts, total }: StorefrontViewProps) {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <StorefrontHeader store={store} />
      <ProductCatalog
        storeId={store.id}
        storeSlug={store.slug}
        initialProducts={initialProducts}
        total={total}
        usdBsRate={store.usdBsRate}
      />
      {store.phone ? <ContactCTA storeName={store.name} phone={store.phone} /> : null}
    </div>
  );
}
