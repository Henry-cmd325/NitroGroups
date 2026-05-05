using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NitroGroups.Shared.Infrastructure.Context.Migrations
{
    /// <inheritdoc />
    public partial class AddGenresMediaAndImageUrls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "cover_image_url",
                table: "music_groups",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "profile_picture_url",
                table: "music_groups",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "group_media",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<long>(type: "bigint", nullable: false),
                    type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
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
                        principalTable: "music_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "music_genres",
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
                name: "group_genres",
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
                        principalTable: "music_genres",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_group_genres_music_groups_group_id",
                        column: x => x.group_id,
                        principalTable: "music_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_group_genres_genre_id",
                table: "group_genres",
                column: "genre_id");

            migrationBuilder.CreateIndex(
                name: "IX_group_genres_group_id",
                table: "group_genres",
                column: "group_id");

            migrationBuilder.CreateIndex(
                name: "IX_group_genres_group_id_genre_id",
                table: "group_genres",
                columns: new[] { "group_id", "genre_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_group_media_group_id",
                table: "group_media",
                column: "group_id");

            migrationBuilder.CreateIndex(
                name: "IX_group_media_group_id_display_order",
                table: "group_media",
                columns: new[] { "group_id", "display_order" });

            migrationBuilder.CreateIndex(
                name: "IX_group_media_group_id_type",
                table: "group_media",
                columns: new[] { "group_id", "type" });

            migrationBuilder.CreateIndex(
                name: "IX_music_genres_name",
                table: "music_genres",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_music_genres_slug",
                table: "music_genres",
                column: "slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "group_genres");

            migrationBuilder.DropTable(
                name: "group_media");

            migrationBuilder.DropTable(
                name: "music_genres");

            migrationBuilder.DropColumn(
                name: "cover_image_url",
                table: "music_groups");

            migrationBuilder.DropColumn(
                name: "profile_picture_url",
                table: "music_groups");
        }
    }
}
