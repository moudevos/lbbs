import { LocalAttentionDetail } from "@/components/local/local-attention-detail";

export default function LocalAttentionPage({ params }: { params: { id: string } }) {
  return <LocalAttentionDetail id={params.id} />;
}
