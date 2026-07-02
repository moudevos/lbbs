import { type NextRequest } from "next/server";
import { escapeLike, searchContext, searchResponse } from "../_utils";

export async function GET(request: NextRequest) {
  const result = await searchContext(request);
  if (result.response) return result.response;
  const term = escapeLike(result.q);
  let query = result.context.admin
    .from("products")
    .select("id,sku,name,category,sale_price,branch_id,is_active,tracks_stock,courtesy_enabled,courtesy_role,counts_for_seller_credit,seller_credit_amount,product_branch_stock(branch_id,stock_current)")
    .eq("is_active", true)
    .or(`name.ilike.%${term}%,sku.ilike.%${term}%,category.ilike.%${term}%`)
    .order("name")
    .limit(20);
  if (result.branchId && result.branchId !== "all") query = query.or(`branch_id.is.null,branch_id.eq.${result.branchId}`);
  const { data } = await query;
  return searchResponse((data ?? []).map((row: any) => {
    const stock = (row.product_branch_stock ?? []).find((item: any) => item.branch_id === result.branchId)?.stock_current ?? 0;
    return {
      id: row.id,
      label: row.name,
      subtitle: `S/ ${Number(row.sale_price ?? 0).toFixed(2)} · Stock: ${stock} · ${row.category ?? "producto"}`,
      metadata: {
        sku: row.sku,
        category: row.category,
        salePrice: Number(row.sale_price ?? 0),
        stock,
        branchId: row.branch_id,
        tracksStock: Boolean(row.tracks_stock ?? true),
        courtesyEnabled: Boolean(row.courtesy_enabled),
        courtesyRole: row.courtesy_role,
        countsForSellerCredit: Boolean(row.counts_for_seller_credit || row.category === "barber_product"),
        sellerCreditAmount: Number(row.seller_credit_amount ?? 0)
      }
    };
  }));
}
