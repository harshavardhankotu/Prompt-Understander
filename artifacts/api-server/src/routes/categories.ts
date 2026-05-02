import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    iconName: c.iconName,
    description: c.description,
    customFields: c.customFields,
  })));
});

export default router;
