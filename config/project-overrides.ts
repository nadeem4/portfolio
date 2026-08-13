/**
 * Exceptions to the automatic repo selection on /projects.
 *
 * Repos are pulled from GitHub automatically and gated on having a description
 * — writing one is the mechanism for surfacing a repo. These two lists only
 * carry the cases where that default is wrong, so the file stays short.
 *
 * Both match on repo name, exactly.
 *
 * Note that only *public* repos are ever candidates: the GitHub endpoint used
 * returns public repositories only, even authenticated. Naming a private repo
 * in either list is inert until that repo is made public.
 */

/** Pinned to the top of the default view, in this order. */
export const featured: string[] = [
  'nl2sql',
  'medalflow',
  'aurora',
  'mini-gpt',
  'ai_logger',
  'microservice_demo',
  'spring_boot_multi_module_framework',
];

/**
 * Removed from every view.
 *
 * Coursework, contest solutions, throwaway utilities, early prototypes, and
 * this site's own repo. Only repos that survive the description gate need
 * listing — anything undescribed is already excluded.
 */
export const hidden: string[] = [
  'portfolio',
  'MET-CS-671---Data-Science-with-Python',
  'MET-CS-566---Analysis-of-Algorithm',
  'MET-CS-664---Artificial-Intelligence',
  'hackerrank',
  'code_gladiator_2020',
  'GoogleCodeJam',
  'airbnb_for_car',
  'collateral_management',
  'hesita_angular_app',
  'excel_to_sql',
  'boilerplate_code',
];
