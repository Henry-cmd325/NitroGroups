import GroupAvailabilityPanel from "@/features/groupAvailability/components/GroupAvailabilityPanel";
export default function GroupAvailabilityPage() {
  return (
    <main className="min-h-screen bg-gray-950 p-8 text-white">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">GroupAvailability</h1>
        <p className="text-sm text-gray-400">
          Vista generada automáticamente por el orquestador.
        </p>
      </header>
      <GroupAvailabilityPanel />
    </main>
  );
}
