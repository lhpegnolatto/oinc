import { ConflictError } from "../../../shared/errors";

export class CategoryInUseError extends ConflictError {
  constructor() {
    super(
      "CATEGORY_IN_USE",
      "Category is still referenced by at least one transaction",
    );
  }
}
