import { getNitroSession } from "@/services/session";
import { redirect } from "next/navigation";
import { Protector } from "@/components/auth";

export default async function ClientDashboardPage() {
    const session = await getNitroSession();

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <Protector>
            <div className="text-white px-8 py-5">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold">Panel de Cliente</h1>
                            <p className="text-gray-400 mt-2">
                                Encuentra y contrata músicos para tus eventos
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <div className="text-3xl mb-2">📅</div>
                            <h3 className="text-xl font-semibold">Próximos Eventos</h3>
                            <p className="text-3xl font-bold text-primary mt-2">0</p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <div className="text-3xl mb-2">📝</div>
                            <h3 className="text-xl font-semibold">Solicitudes Activas</h3>
                            <p className="text-3xl font-bold text-primary mt-2">0</p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <div className="text-3xl mb-2">⭐</div>
                            <h3 className="text-xl font-semibold">Eventos Completados</h3>
                            <p className="text-3xl font-bold text-primary mt-2">0</p>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Find Musicians */}
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h2 className="text-2xl font-semibold mb-4">🎸 Buscar Músicos</h2>
                            <p className="text-gray-400 mb-4">
                                Encuentra el grupo perfecto para tu próximo evento
                            </p>
                            <a
                                href="/groups"
                                className="inline-block bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                            >
                                Explorar Músicos
                            </a>
                        </div>

                        {/* My Requests */}
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h2 className="text-2xl font-semibold mb-4">📋 Mis Solicitudes</h2>
                            <p className="text-gray-400 mb-4">
                                No tienes solicitudes activas
                            </p>
                            <button
                                className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors cursor-not-allowed"
                                disabled
                            >
                                Crear Solicitud
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Protector>
    );
}
