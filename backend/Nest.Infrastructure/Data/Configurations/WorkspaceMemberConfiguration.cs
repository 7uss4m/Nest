using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nest.Domain.Entities;

namespace Nest.Infrastructure.Data.Configurations;

public class WorkspaceMemberConfiguration : IEntityTypeConfiguration<WorkspaceMember>
{
    public void Configure(EntityTypeBuilder<WorkspaceMember> b)
    {
        b.HasKey(m => new { m.WorkspaceId, m.UserId });
        b.HasOne(m => m.Workspace).WithMany(w => w.Members).HasForeignKey(m => m.WorkspaceId);
    }
}
