using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NitroGroups.Persistence.Context.Migrations
{
    /// <inheritdoc />
    public partial class AddOutboxEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "outbox_events");
        }
    }
}
