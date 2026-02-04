import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] text-white flex items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-3xl font-bold">Página no encontrada</h1>
        <p className="text-gray-300">
          No pudimos encontrar lo que estás buscando.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Volver al Home
        </Link>
      </div>
    </div>
  );
}
