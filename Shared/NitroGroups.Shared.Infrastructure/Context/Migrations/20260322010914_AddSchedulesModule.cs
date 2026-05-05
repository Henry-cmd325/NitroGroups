using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NitroGroups.Shared.Infrastructure.Context.Migrations
{
    /// <inheritdoc />
    public partial class AddSchedulesModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "busy_schedules",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<long>(type: "bigint", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    source = table.Column<string>(type: "text", nullable: false, defaultValue: "Contract"),
                    contract_id = table.Column<long>(type: "bigint", nullable: true),
                    start_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    end_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_busy_schedules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "group_availability",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<long>(type: "bigint", nullable: false),
                    start_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    end_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    available = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    custom_price = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    note = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    rrule = table.Column<string>(type: "text", nullable: true),
                    timezone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "UTC"),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_group_availability", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_busy_schedules_contract_id",
                table: "busy_schedules",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "IX_busy_schedules_group_id_start_at",
                table: "busy_schedules",
                columns: new[] { "group_id", "start_at" });

            migrationBuilder.CreateIndex(
                name: "IX_busy_schedules_group_id_start_at_end_at",
                table: "busy_schedules",
                columns: new[] { "group_id", "start_at", "end_at" });

            migrationBuilder.CreateIndex(
                name: "IX_group_availability_group_id_available",
                table: "group_availability",
                columns: new[] { "group_id", "available" });

            migrationBuilder.CreateIndex(
                name: "IX_group_availability_group_id_start_at",
                table: "group_availability",
                columns: new[] { "group_id", "start_at" });

            migrationBuilder.CreateIndex(
                name: "IX_group_availability_group_id_start_at_end_at",
                table: "group_availability",
                columns: new[] { "group_id", "start_at", "end_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "busy_schedules");

            migrationBuilder.DropTable(
                name: "group_availability");
        }
    }
}
