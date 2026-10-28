-- Preserve existing experiences; their subcategory remains unset until edited.
CREATE TABLE "Category" (
  "name" VARCHAR(40) PRIMARY KEY
);
CREATE TABLE "Subcategory" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(80) NOT NULL,
  "categoryName" VARCHAR(40) NOT NULL REFERENCES "Category"("name") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("id", "categoryName"),
  UNIQUE ("categoryName", "name")
);
INSERT INTO "Category" ("name") VALUES ('Cultura'), ('Gastronomía'), ('Aventura');
INSERT INTO "Category" ("name") SELECT DISTINCT "category" FROM "Experience" ON CONFLICT DO NOTHING;
INSERT INTO "Subcategory" ("id", "name", "categoryName") VALUES
('10000000-0000-4000-8000-000000000001', 'Museos', 'Cultura'),
('10000000-0000-4000-8000-000000000002', 'Teatro', 'Cultura'),
('10000000-0000-4000-8000-000000000003', 'Recorrido histórico', 'Cultura'),
('10000000-0000-4000-8000-000000000004', 'Ruta de cafés', 'Gastronomía'),
('10000000-0000-4000-8000-000000000005', 'Degustación', 'Gastronomía'),
('10000000-0000-4000-8000-000000000006', 'Taller de cocina', 'Gastronomía'),
('10000000-0000-4000-8000-000000000007', 'Senderismo', 'Aventura'),
('10000000-0000-4000-8000-000000000008', 'Ciclismo', 'Aventura'),
('10000000-0000-4000-8000-000000000009', 'Camping', 'Aventura');
ALTER TABLE "Experience" ADD COLUMN "subcategoryId" UUID;
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_category_fkey" FOREIGN KEY ("category") REFERENCES "Category"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_subcategoryId_category_fkey" FOREIGN KEY ("subcategoryId", "category") REFERENCES "Subcategory"("id", "categoryName") ON DELETE RESTRICT ON UPDATE CASCADE;
