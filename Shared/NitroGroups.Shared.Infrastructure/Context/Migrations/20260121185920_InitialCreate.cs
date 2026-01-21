using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NitroGroups.Shared.Infrastructure.Context.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "music_groups",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    owner_user_id = table.Column<long>(type: "bigint", nullable: false),
                    slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    group_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    biography = table.Column<string>(type: "text", nullable: false),
                    num_members = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    years_experience = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    location_text = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    service_radius_km = table.Column<int>(type: "integer", nullable: false, defaultValue: 50),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "MXN"),
                    base_price = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    hourly_rate = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    minimum_duration_hours = table.Column<int>(type: "integer", nullable: false, defaultValue: 2),
                    setup_time_minutes = table.Column<int>(type: "integer", nullable: false, defaultValue: 30),
                    average_rating = table.Column<decimal>(type: "numeric(3,2)", nullable: false, defaultValue: 0m),
                    total_reviews = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    view_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    booking_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_verified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_featured = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_accepting_bookings = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<long>(type: "bigint", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_groups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_events",
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
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    auth0_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    user_type = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "group_members",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    role = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    left_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    joined_via = table.Column<int>(type: "integer", nullable: false),
                    approved_by = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_group_members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_group_members_music_groups_group_id",
                        column: x => x.group_id,
                        principalTable: "music_groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "musicians",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    years_experience = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    short_bio = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: true),
                    is_open_to_join = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_musicians", x => x.Id);
                    table.ForeignKey(
                        name: "FK_musicians_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_group_members_group_id_is_active",
                table: "group_members",
                columns: new[] { "group_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_group_members_group_id_user_id",
                table: "group_members",
                columns: new[] { "group_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_music_groups_is_accepting_bookings_average_rating",
                table: "music_groups",
                columns: new[] { "is_accepting_bookings", "average_rating" });

            migrationBuilder.CreateIndex(
                name: "IX_music_groups_is_featured_average_rating",
                table: "music_groups",
                columns: new[] { "is_featured", "average_rating" });

            migrationBuilder.CreateIndex(
                name: "IX_music_groups_owner_user_id",
                table: "music_groups",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_music_groups_slug",
                table: "music_groups",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_musicians_user_id",
                table: "musicians",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_created_at",
                table: "outbox_events",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_event_type",
                table: "outbox_events",
                column: "event_type");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_next_retry_at",
                table: "outbox_events",
                column: "next_retry_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_processed",
                table: "outbox_events",
                column: "processed");

            migrationBuilder.CreateIndex(
                name: "IX_users_auth0_id",
                table: "users",
                column: "auth0_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "group_members");

            migrationBuilder.DropTable(
                name: "musicians");

            migrationBuilder.DropTable(
                name: "outbox_events");

            migrationBuilder.DropTable(
                name: "music_groups");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
