using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NitroGroups.Shared.Infrastructure.Context.Migrations
{
    /// <inheritdoc />
    public partial class RevertEnumsToIntegers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE busy_schedules ALTER COLUMN source DROP DEFAULT;");
            
            migrationBuilder.Sql("ALTER TABLE users ALTER COLUMN user_type TYPE integer USING (CASE user_type WHEN 'Client' THEN 0 WHEN 'Musician' THEN 1 WHEN 'BandMember' THEN 2 WHEN 'Admin' THEN 3 WHEN 'External' THEN 4 ELSE 0 END);");

            migrationBuilder.Sql("ALTER TABLE group_members ALTER COLUMN role TYPE integer USING (CASE role WHEN 'Leader' THEN 0 WHEN 'Member' THEN 1 WHEN 'Guest' THEN 2 ELSE 1 END);");
            
            migrationBuilder.Sql("ALTER TABLE group_members ALTER COLUMN joined_via TYPE integer USING (CASE joined_via WHEN 'Manual' THEN 0 WHEN 'Request' THEN 1 WHEN 'Invitation' THEN 2 ELSE 0 END);");

            migrationBuilder.Sql("ALTER TABLE group_media ALTER COLUMN type TYPE integer USING (CASE type WHEN 'Photo' THEN 0 WHEN 'Video' THEN 1 WHEN 'Audio' THEN 2 ELSE 0 END);");

            migrationBuilder.Sql("ALTER TABLE busy_schedules ALTER COLUMN source TYPE integer USING (CASE source WHEN 'Contract' THEN 0 WHEN 'Rehearsal' THEN 1 WHEN 'Maintenance' THEN 2 WHEN 'Personal' THEN 3 WHEN 'Travel' THEN 4 ELSE 0 END);");

            migrationBuilder.AlterColumn<int>(
                name: "user_type",
                table: "users",
                type: "integer",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "role",
                table: "group_members",
                type: "integer",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "joined_via",
                table: "group_members",
                type: "integer",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "type",
                table: "group_media",
                type: "integer",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            migrationBuilder.AlterColumn<int>(
                name: "source",
                table: "busy_schedules",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "Contract");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE users ALTER COLUMN user_type TYPE character varying(20) USING (CASE user_type WHEN 0 THEN 'Client' WHEN 1 THEN 'Musician' WHEN 2 THEN 'BandMember' WHEN 3 THEN 'Admin' WHEN 4 THEN 'External' ELSE 'Client' END);");

            migrationBuilder.Sql("ALTER TABLE group_members ALTER COLUMN role TYPE character varying(20) USING (CASE role WHEN 0 THEN 'Leader' WHEN 1 THEN 'Member' WHEN 2 THEN 'Guest' ELSE 'Member' END);");

            migrationBuilder.Sql("ALTER TABLE group_members ALTER COLUMN joined_via TYPE character varying(20) USING (CASE joined_via WHEN 0 THEN 'Manual' WHEN 1 THEN 'Request' WHEN 2 THEN 'Invitation' ELSE 'Manual' END);");

            migrationBuilder.Sql("ALTER TABLE group_media ALTER COLUMN type TYPE character varying(10) USING (CASE type WHEN 0 THEN 'Photo' WHEN 1 THEN 'Video' WHEN 2 THEN 'Audio' ELSE 'Photo' END);");

            migrationBuilder.Sql("ALTER TABLE busy_schedules ALTER COLUMN source TYPE text USING (CASE source WHEN 0 THEN 'Contract' WHEN 1 THEN 'Rehearsal' WHEN 2 THEN 'Maintenance' WHEN 3 THEN 'Personal' WHEN 4 THEN 'Travel' ELSE 'Contract' END);");
            
            migrationBuilder.AlterColumn<string>(
                name: "source",
                table: "busy_schedules",
                type: "text",
                nullable: false,
                defaultValue: "Contract",
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);
        }
    }
}
