using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NitroGroups.Core.Groups.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialModuleSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "groups");

            migrationBuilder.CreateTable(
                name: "music_genres",
                schema: "groups",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    icon_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    color_hex = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_genres", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "music_groups",
                schema: "groups",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
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
                    profile_picture_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    cover_image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<long>(type: "bigint", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_groups", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_events",
                schema: "groups",
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
                name: "group_genres",
                schema: "groups",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<long>(type: "bigint", nullable: false),
                    genre_id = table.Column<long>(type: "bigint", nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_group_genres", x => x.id);
                    table.ForeignKey(
                        name: "FK_group_genres_music_genres_genre_id",
                        column: x => x.genre_id,
                        principalSchema: "groups",
                        principalTable: "music_genres",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_group_genres_music_groups_group_id",
                        column: x => x.group_id,
                        principalSchema: "groups",
                        principalTable: "music_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "group_media",
                schema: "groups",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<long>(type: "bigint", nullable: false),
                    type = table.Column<int>(type: "integer", maxLength: 10, nullable: false),
                    url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    thumbnail_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: true),
                    duration_seconds = table.Column<int>(type: "integer", nullable: true),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    display_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<long>(type: "bigint", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_group_media", x => x.id);
                    table.ForeignKey(
                        name: "FK_group_media_music_groups_group_id",
                        column: x => x.group_id,
                        principalSchema: "groups",
                        principalTable: "music_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "group_members",
                schema: "groups",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    role = table.Column<int>(type: "integer", maxLength: 20, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    left_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    joined_via = table.Column<int>(type: "integer", maxLength: 20, nullable: false),
                    approved_by = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_group_members", x => x.id);
                    table.ForeignKey(
                        name: "FK_group_members_music_groups_group_id",
                        column: x => x.group_id,
                        principalSchema: "groups",
                        principalTable: "music_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_group_genres_genre_id",
                schema: "groups",
                table: "group_genres",
                column: "genre_id");

            migrationBuilder.CreateIndex(
                name: "IX_group_genres_group_id",
                schema: "groups",
                table: "group_genres",
                column: "group_id");

            migrationBuilder.CreateIndex(
                name: "IX_group_genres_group_id_genre_id",
                schema: "groups",
                table: "group_genres",
                columns: new[] { "group_id", "genre_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_group_media_group_id",
                schema: "groups",
                table: "group_media",
                column: "group_id");

            migrationBuilder.CreateIndex(
                name: "IX_group_media_group_id_display_order",
                schema: "groups",
                table: "group_media",
                columns: new[] { "group_id", "display_order" });

            migrationBuilder.CreateIndex(
                name: "IX_group_media_group_id_type",
                schema: "groups",
                table: "group_media",
                columns: new[] { "group_id", "type" });

            migrationBuilder.CreateIndex(
                name: "IX_group_members_group_id_is_active",
                schema: "groups",
                table: "group_members",
                columns: new[] { "group_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_group_members_group_id_user_id",
                schema: "groups",
                table: "group_members",
                columns: new[] { "group_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_music_genres_name",
                schema: "groups",
                table: "music_genres",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_music_genres_slug",
                schema: "groups",
                table: "music_genres",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_music_groups_is_accepting_bookings_average_rating",
                schema: "groups",
                table: "music_groups",
                columns: new[] { "is_accepting_bookings", "average_rating" });

            migrationBuilder.CreateIndex(
                name: "IX_music_groups_is_featured_average_rating",
                schema: "groups",
                table: "music_groups",
                columns: new[] { "is_featured", "average_rating" });

            migrationBuilder.CreateIndex(
                name: "IX_music_groups_owner_user_id",
                schema: "groups",
                table: "music_groups",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_music_groups_slug",
                schema: "groups",
                table: "music_groups",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_created_at",
                schema: "groups",
                table: "outbox_events",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_event_type",
                schema: "groups",
                table: "outbox_events",
                column: "event_type");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_next_retry_at",
                schema: "groups",
                table: "outbox_events",
                column: "next_retry_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_processed",
                schema: "groups",
                table: "outbox_events",
                column: "processed");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "group_genres",
                schema: "groups");

            migrationBuilder.DropTable(
                name: "group_media",
                schema: "groups");

            migrationBuilder.DropTable(
                name: "group_members",
                schema: "groups");

            migrationBuilder.DropTable(
                name: "outbox_events",
                schema: "groups");

            migrationBuilder.DropTable(
                name: "music_genres",
                schema: "groups");

            migrationBuilder.DropTable(
                name: "music_groups",
                schema: "groups");
        }
    }
}
