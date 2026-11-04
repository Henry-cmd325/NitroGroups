using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NitroGroups.Core.Groups.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyRoleModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // GroupMemberRole pasa de Leader(0)/Member(1)/Guest(2) a Owner(0)/Member(1)/Manager(2).
            // Leader -> Owner conserva el valor 0. Guest no tenía permisos, así que pasa a Member
            // ANTES de que el valor 2 empiece a significar Manager.
            migrationBuilder.Sql("UPDATE groups.group_members SET role = 1 WHERE role = 2;");

            // El dueño del grupo siempre figura como Owner activo en group_members.
            // Literales: role 0 = GroupMemberRole.Owner, joined_via 2 = JoinedVia.Manual (enums guardados como int).
            migrationBuilder.Sql(@"
                INSERT INTO groups.group_members (group_id, user_id, role, is_active, joined_at, joined_via, approved_by)
                SELECT g.id, g.owner_user_id, 0, TRUE, now(), 2, 0
                FROM groups.music_groups g
                WHERE g.owner_user_id > 0
                  AND NOT EXISTS (SELECT 1 FROM groups.group_members m WHERE m.group_id = g.id AND m.user_id = g.owner_user_id);");
            migrationBuilder.Sql(@"
                UPDATE groups.group_members m SET role = 0, is_active = TRUE
                FROM groups.music_groups g
                WHERE m.group_id = g.id AND m.user_id = g.owner_user_id AND m.role <> 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No reversible con precisión: Guest y Member quedaron unificados.
        }
    }
}
