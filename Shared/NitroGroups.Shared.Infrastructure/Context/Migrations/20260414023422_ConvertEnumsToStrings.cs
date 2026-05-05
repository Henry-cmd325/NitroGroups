using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NitroGroups.Shared.Infrastructure.Context.Migrations
{
    /// <inheritdoc />
    public partial class ConvertEnumsToStrings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── users.user_type: integer → varchar(20) ──────────────────
            // Map: 0=Client, 1=Musician, 2=BandMember, 3=Admin
            migrationBuilder.Sql("""
                ALTER TABLE users
                ALTER COLUMN user_type TYPE character varying(20)
                USING CASE user_type
                    WHEN 0 THEN 'Client'
                    WHEN 1 THEN 'Musician'
                    WHEN 2 THEN 'BandMember'
                    WHEN 3 THEN 'Admin'
                    ELSE 'Client'
                END;
                """);

            // ── group_members.role: integer → varchar(20) ───────────────
            // Map: 0=Leader, 1=Member, 2=Guest
            migrationBuilder.Sql("""
                ALTER TABLE group_members
                ALTER COLUMN role TYPE character varying(20)
                USING CASE role
                    WHEN 0 THEN 'Leader'
                    WHEN 1 THEN 'Member'
                    WHEN 2 THEN 'Guest'
                    ELSE 'Member'
                END;
                """);

            // ── group_members.joined_via: integer → varchar(20) ─────────
            // Map: 0=Request, 1=Invitation, 2=Manual
            migrationBuilder.Sql("""
                ALTER TABLE group_members
                ALTER COLUMN joined_via TYPE character varying(20)
                USING CASE joined_via
                    WHEN 0 THEN 'Request'
                    WHEN 1 THEN 'Invitation'
                    WHEN 2 THEN 'Manual'
                    ELSE 'Manual'
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ── Revert users.user_type: varchar → integer ───────────────
            migrationBuilder.Sql("""
                ALTER TABLE users
                ALTER COLUMN user_type TYPE integer
                USING CASE user_type
                    WHEN 'Client'     THEN 0
                    WHEN 'Musician'   THEN 1
                    WHEN 'BandMember' THEN 2
                    WHEN 'Admin'      THEN 3
                    ELSE 0
                END;
                """);

            // ── Revert group_members.role: varchar → integer ────────────
            migrationBuilder.Sql("""
                ALTER TABLE group_members
                ALTER COLUMN role TYPE integer
                USING CASE role
                    WHEN 'Leader' THEN 0
                    WHEN 'Member' THEN 1
                    WHEN 'Guest'  THEN 2
                    ELSE 1
                END;
                """);

            // ── Revert group_members.joined_via: varchar → integer ──────
            migrationBuilder.Sql("""
                ALTER TABLE group_members
                ALTER COLUMN joined_via TYPE integer
                USING CASE joined_via
                    WHEN 'Request'    THEN 0
                    WHEN 'Invitation' THEN 1
                    WHEN 'Manual'     THEN 2
                    ELSE 2
                END;
                """);
        }
    }
}
