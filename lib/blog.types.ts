export interface BlogPost {
  /** Trailing hex id from the Medium URL. Stable across slug rewrites; seeds the identicon. */
  id: string;
  title: string;
  subtitle: string;
  url: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string;
  category: string;
}

// Categories are deliberately not enumerated here.
//
// `Category` is a Notion *select* field, so its values are constrained at the
// source — a post cannot carry a typo'd category. Mirroring the option list in
// TypeScript validated nothing that could actually go wrong, and its only real
// effect was breaking the build whenever a new category was legitimately added
// in Notion, until someone hand-edited this file to agree.
