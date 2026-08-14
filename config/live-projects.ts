export interface LiveProject {
  name: string;
  status: 'coming-soon' | 'live';
  /** Required once status is 'live'. */
  url?: string;
}

export const liveProjects: LiveProject[] = [{ name: 'First live project', status: 'coming-soon' }];

/**
 * Whether anything is actually deployed yet.
 *
 * The nav links to /live-projects only when this is true. A top-level nav item
 * leading to a page that reads "COMING SOON" advertises an empty room; the link
 * appears by itself once a project goes live, with no code change needed.
 */
export const hasLiveProjects = liveProjects.some((project) => project.status === 'live');
