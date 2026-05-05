"use client";

import { useQuery } from "@tanstack/react-query";
import { GroupCalendar, GroupProfile, GroupGallery } from "@/components/groups";
import { Protector } from "@/components/auth";
import { TabItem, TabbedSection } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { groupsService } from "@/services/groups.service";

export default function MusicianDashboardPage() {
  const { user } = useCurrentUser();
  const userId = user?.id;

  const { data: group } = useQuery({
    queryKey: ["music-group", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuario no autenticado");
      return groupsService.getByUserId(userId);
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 10,
  });

  return (
    <Protector>
      <div className="min-h-screen pb-20">
        {/* Profile hero + bio + pricing */}
        <GroupProfile />

        {/* Management tabs */}
        <div className="max-w-6xl mx-auto px-6 mt-10">
          <TabbedSection>
            <TabItem title="Galería" tabKey="galeria">
              <GroupGallery />
            </TabItem>

            <TabItem title="Eventos" tabKey="eventos">
              <div className="text-center py-16">
                <h3 className="text-lg font-semibold text-white mb-2">Próximos Eventos</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Las solicitudes aceptadas y eventos confirmados aparecerán aquí.
                </p>
              </div>
            </TabItem>

            <TabItem title="Calendario" tabKey="calendario">
              <div className="py-6">
                {group?.id ? (
                  <GroupCalendar groupId={group.id} mode="private" />
                ) : (
                  <div className="text-center text-sm text-gray-500 py-10">Cargando calendario...</div>
                )}
              </div>
            </TabItem>

            <TabItem title="Cotizaciones" tabKey="cotizaciones">
              <div className="text-center py-16">
                <h3 className="text-lg font-semibold text-white mb-2">Cotizaciones</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Aquí gestionarás los presupuestos solicitados por clientes potenciales.
                </p>
              </div>
            </TabItem>
          </TabbedSection>
        </div>
      </div>
    </Protector>
  );
}
