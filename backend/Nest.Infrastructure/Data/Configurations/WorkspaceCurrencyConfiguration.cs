using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nest.Domain.Entities;

namespace Nest.Infrastructure.Data.Configurations;

public class WorkspaceCurrencyConfiguration : IEntityTypeConfiguration<WorkspaceCurrency>
{
    public void Configure(EntityTypeBuilder<WorkspaceCurrency> b)
    {
        b.HasKey(c => new { c.WorkspaceId, c.Code });
        b.Property(c => c.Code).HasMaxLength(10);
        b.Property(c => c.Symbol).HasMaxLength(10);
        b.HasOne(c => c.Workspace)
            .WithMany(w => w.Currencies)
            .HasForeignKey(c => c.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
