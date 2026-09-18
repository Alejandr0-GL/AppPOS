using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Una tabla de prueba para verificar migraciones
    public DbSet<TestConnection> TestConnections { get; set; }
}

public class TestConnection
{
    public int Id { get; set; }
    public DateTime ConnectedAt { get; set; } = DateTime.Now;
}