import { notFound, redirect } from "next/navigation";

type LegacyApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyApplicationDetailPage({ params }: LegacyApplicationDetailPageProps) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  redirect(`/admin/applications?application=${id}`);
}
