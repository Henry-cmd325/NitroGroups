using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NitroGroups.Core.Users.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialModuleSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "users");

            migrationBuilder.CreateTable(
                name: "outbox_events",
                schema: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    event_data = table.Column<string>(type: "text", nullable: false),
                    processed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    processed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    retry_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    last_error = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    next_retry_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outbox_events", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                schema: "users",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    auth0_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    user_type = table.Column<int>(type: "integer", maxLength: 20, nullable: false),
                    profile_picture_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    location_text = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    email_verified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    phone_verified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "musicians",
                schema: "users",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    years_experience = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    short_bio = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: true),
                    is_open_to_join = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_musicians", x => x.id);
                    table.ForeignKey(
                        name: "FK_musicians_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "users",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_musicians_user_id",
                schema: "users",
                table: "musicians",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_created_at",
                schema: "users",
                table: "outbox_events",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_event_type",
                schema: "users",
                table: "outbox_events",
                column: "event_type");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_next_retry_at",
                schema: "users",
                table: "outbox_events",
                column: "next_retry_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_processed",
                schema: "users",
                table: "outbox_events",
                column: "processed");

            migrationBuilder.CreateIndex(
                name: "IX_users_auth0_id",
                schema: "users",
                table: "users",
                column: "auth0_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                schema: "users",
                table: "users",
                column: "email");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "musicians",
                schema: "users");

            migrationBuilder.DropTable(
                name: "outbox_events",
                schema: "users");

            migrationBuilder.DropTable(
                name: "users",
                schema: "users");
        }
    }
}
