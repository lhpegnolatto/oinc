import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requireAuth } from "../../../shared/auth/require-auth";
import { db } from "../../../shared/db/client";
import { UnauthorizedError } from "../../../shared/errors";
import { zodValidationHook } from "../../../shared/validation/zod-validation-hook";
import { createCategory } from "../commands/create-category";
import { deleteCategory } from "../commands/delete-category";
import { updateCategory } from "../commands/update-category";
import { listCategories } from "../queries/list-categories";
import { CategoriesRepository } from "../repositories/categories-repository";
import { categoryIdParamSchema } from "../schemas/category-id-param.schema";
import { toCategoryResponse } from "../schemas/category-response.schema";
import { createCategorySchema } from "../schemas/create-category.schema";
import { updateCategorySchema } from "../schemas/update-category.schema";

const repo = new CategoriesRepository(db);

export const categoriesRouter = new Hono()
  .use("*", requireAuth)
  .post(
    "/",
    zValidator("json", createCategorySchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const input = c.req.valid("json");
      const created = await createCategory(repo, {
        userId: user.id,
        ...input,
      });
      return c.json(toCategoryResponse(created), 201);
    },
  )
  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const categories = await listCategories(repo, user.id);
    return c.json(categories.map(toCategoryResponse));
  })
  .patch(
    "/:id",
    zValidator("param", categoryIdParamSchema, zodValidationHook),
    zValidator("json", updateCategorySchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      const { name, color, icon } = c.req.valid("json");
      const updated = await updateCategory(repo, {
        id,
        userId: user.id,
        name,
        color,
        icon,
      });
      return c.json(toCategoryResponse(updated));
    },
  )
  .delete(
    "/:id",
    zValidator("param", categoryIdParamSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      await deleteCategory(repo, { id, userId: user.id });
      return c.body(null, 204);
    },
  );
