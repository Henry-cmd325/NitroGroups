using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NitroGroups.Core.Bookings.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialModuleSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "bookings");

            migrationBuilder.CreateTable(
                name: "event_requests",
                schema: "bookings",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<long>(type: "bigint", nullable: false),
                    client_user_id = table.Column<long>(type: "bigint", nullable: false),
                    event_date = table.Column<DateOnly>(type: "date", nullable: false),
                    start_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    duration_hours = table.Column<int>(type: "integer", nullable: false),
                    event_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    location_text = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    guest_count = table.Column<int>(type: "integer", nullable: true),
                    budget = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "MXN"),
                    message = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    responded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    response_message = table.Column<string>(type: "text", nullable: true),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<long>(type: "bigint", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_requests", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_events",
                schema: "bookings",
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
                name: "event_request_messages",
                schema: "bookings",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    event_request_id = table.Column<long>(type: "bigint", nullable: false),
                    sender_user_id = table.Column<long>(type: "bigint", nullable: false),
                    sender_party = table.Column<int>(type: "integer", nullable: false),
                    body = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_request_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_event_request_messages_event_requests_event_request_id",
                        column: x => x.event_request_id,
                        principalSchema: "bookings",
                        principalTable: "event_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_event_request_messages_event_request_id_created_at",
                schema: "bookings",
                table: "event_request_messages",
                columns: new[] { "event_request_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_event_requests_client_user_id_created_at",
                schema: "bookings",
                table: "event_requests",
                columns: new[] { "client_user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_event_requests_group_id_status_created_at",
                schema: "bookings",
                table: "event_requests",
                columns: new[] { "group_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_created_at",
                schema: "bookings",
                table: "outbox_events",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_event_type",
                schema: "bookings",
                table: "outbox_events",
                column: "event_type");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_next_retry_at",
                schema: "bookings",
                table: "outbox_events",
                column: "next_retry_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_events_processed",
                schema: "bookings",
                table: "outbox_events",
                column: "processed");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "event_request_messages",
                schema: "bookings");

            migrationBuilder.DropTable(
                name: "outbox_events",
                schema: "bookings");

            migrationBuilder.DropTable(
                name: "event_requests",
                schema: "bookings");
        }
    }
}
