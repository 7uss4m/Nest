using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nest.Domain.Entities;

namespace Nest.Infrastructure.Data.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> b)
    {
        b.Property(t => t.Amount).HasPrecision(18, 4);
        b.HasIndex(t => t.AccountId);
        b.HasIndex(t => t.Date);
        b.HasIndex(t => t.CategoryId);
        b.HasOne(t => t.Account).WithMany(a => a.Transactions)
            .HasForeignKey(t => t.AccountId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(t => t.TransferToAccount).WithMany()
            .HasForeignKey(t => t.TransferToAccountId).OnDelete(DeleteBehavior.Restrict);
    }
}
