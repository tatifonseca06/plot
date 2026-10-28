import type { RequestHandler } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";

export const list: RequestHandler = async (_request, response) => {
  const items = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { subcategories: { orderBy: { name: "asc" } } },
  });
  response.json({ data: { items } });
};

export async function validateSubcategory(category: string, subcategoryId: string) {
  const match = await prisma.subcategory.findUnique({
    where: { id_categoryName: { id: subcategoryId, categoryName: category } },
  });
  if (!match) throw new HttpError(400, "INVALID_SUBCATEGORY", "Selecciona una subcategoría que pertenezca a la categoría elegida.");
}
