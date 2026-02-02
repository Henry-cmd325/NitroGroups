import { GroupProfile } from "@/components/groups";
import ProtectedPage from "@/components/identity/ProtectedPage";

import { TabItem, TabbedSection } from "@/components/controls";

export default function MusicianDashboardPage() {
  return (
    <ProtectedPage>
      <GroupProfile />
      <TabbedSection>
        <TabItem title="Galeria" tabKey="galeria">
          <div>Galeria</div>
        </TabItem>
        <TabItem title="Eventos" tabKey="eventos">
          <div>Eventos</div>
        </TabItem>
        <TabItem title="Calendario" tabKey="calendario">
          <div>Calendario</div>
        </TabItem>
        <TabItem title="Cotizaciones" tabKey="cotizaciones">
          <div>Cotizaciones</div>
        </TabItem>
      </TabbedSection>
    </ProtectedPage>
  );
}
