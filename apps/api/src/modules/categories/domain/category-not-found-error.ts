import { NotFoundError } from "../../../shared/errors";

// Thrown for "no category with this id", "category belongs to another user",
// and "category is a system category" alike — indistinguishable in the
// response on purpose, mirroring WalletNotFoundError.
export class CategoryNotFoundError extends NotFoundError {
  constructor() {
    super("CATEGORY_NOT_FOUND", "Category not found");
  }
}
