using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NitroGroups.Core.Users.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyRoleModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // UserType pasa de Client(0)/Musician(1)/BandMember(2)/Admin(3) a Client(0)/Musician(1).
            // BandMember era un músico dentro de un grupo: ese dato ahora vive en groups.group_members.
            // Admin deja de ser un tipo de cuenta: se define por el rol "admin" de Auth0.
            migrationBuilder.Sql("UPDATE users.users SET user_type = 1 WHERE user_type = 2;");
            migrationBuilder.Sql("UPDATE users.users SET user_type = 0 WHERE user_type = 3;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No reversible con precisión: no se sabe qué músicos eran BandMember ni quién era Admin.
        }
    }
}
