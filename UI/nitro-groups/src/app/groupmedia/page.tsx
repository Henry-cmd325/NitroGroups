import GroupMediaPanel from "@/features/groupMedia/components/GroupMediaPanel";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GroupMediaPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = sp.groupId;
  const groupId = Number(Array.isArray(raw) ? raw[0] : raw) || 0;

  return (
    <main className="min-h-screen bg-gray-950 p-8 text-white">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">GroupMedia</h1>
        <p className="text-sm text-gray-400">
          Vista generada automáticamente por el orquestador. Añade{" "}
          <code className="rounded bg-gray-800 px-1">?groupId=</code> para listar
          medios.
        </p>
      </header>
      <GroupMediaPanel groupId={groupId} />
    </main>
  );
}
