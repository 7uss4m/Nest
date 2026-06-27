using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPlannedPaymentSkip : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "SkippedUntil",
                table: "PlannedPayments",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SkippedUntil",
                table: "PlannedPayments");
        }
    }
}
