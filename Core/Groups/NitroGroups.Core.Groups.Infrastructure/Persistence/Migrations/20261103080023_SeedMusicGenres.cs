using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NitroGroups.Core.Groups.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedMusicGenres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Catálogo inicial de géneros que se contratan para eventos en México.
            // Idempotente: no pisa géneros que ya existan con el mismo slug.
            migrationBuilder.Sql(@"
                INSERT INTO groups.music_genres (name, slug, is_active) VALUES
                    ('Mariachi', 'mariachi', TRUE),
                    ('Banda sinaloense', 'banda-sinaloense', TRUE),
                    ('Norteño', 'norteno', TRUE),
                    ('Grupo versátil', 'grupo-versatil', TRUE),
                    ('Cumbia', 'cumbia', TRUE),
                    ('Salsa', 'salsa', TRUE),
                    ('Son jarocho', 'son-jarocho', TRUE),
                    ('Trío romántico', 'trio-romantico', TRUE),
                    ('Rock en español', 'rock-en-espanol', TRUE),
                    ('Pop', 'pop', TRUE),
                    ('Jazz', 'jazz', TRUE),
                    ('Música de cámara', 'musica-de-camara', TRUE),
                    ('DJ y electrónica', 'dj-electronica', TRUE),
                    ('Sonido y cumbia sonidera', 'cumbia-sonidera', TRUE)
                ON CONFLICT (slug) DO NOTHING;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM groups.music_genres g
                WHERE g.slug IN ('mariachi', 'banda-sinaloense', 'norteno', 'grupo-versatil', 'cumbia', 'salsa', 'son-jarocho', 'trio-romantico', 'rock-en-espanol', 'pop', 'jazz', 'musica-de-camara', 'dj-electronica', 'cumbia-sonidera')
                  AND NOT EXISTS (SELECT 1 FROM groups.group_genres gg WHERE gg.genre_id = g.id);");
        }
    }
}
