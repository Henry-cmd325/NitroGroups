"use client";

import { useQuery } from "@tanstack/react-query";
import { TabItem, TabbedSection } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { groupsService } from "@/features/groups/services/groups.service";
import GroupProfile from "@/features/groups/components/GroupProfile";
import GroupCalendar from "@/features/groupAvailability/components/GroupCalendar";
import GroupGallery from "@/features/groupMedia/components/GroupGallery";
import { GroupInbox } from "@/features/bookings/components/GroupInbox";

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
    <div className="min-h-screen pb-20">
      <GroupProfile />

      <div className="max-w-6xl mx-auto px-6 mt-10">
        <TabbedSection>
          <TabItem title="Solicitudes" tabKey="solicitudes">
            {group?.id ? <GroupInbox groupId={group.id} /> : <p className="text-papel-2 py-10">Cargando…</p>}
          </TabItem>
          <TabItem title="Galería" tabKey="galeria">
            <GroupGallery />
          </TabItem>

          <TabItem title="Calendario" tabKey="calendario">
            <div className="py-6">
              {group?.id ? (
                <GroupCalendar groupId={group.id} mode="private" />
              ) : (
                <p className="text-papel-2 py-10">Cargando calendario…</p>
              )}
            </div>
          </TabItem>
        </TabbedSection>
      </div>
    </div>
  );
}
