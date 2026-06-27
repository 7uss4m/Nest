using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Nest.Infrastructure.Data;

public class NestDbContextFactory : IDesignTimeDbContextFactory<NestDbContext>
{
    public NestDbContext CreateDbContext(string[] args)
    {
        var opts = new DbContextOptionsBuilder<NestDbContext>()
            .UseNpgsql("Host=localhost;Database=nest;Username=postgres;Password=postgres")
            .Options;
        return new NestDbContext(opts);
    }
}
