/*
 * Shared variant metadata for the commit graph pages.
 * One entry per visualization — used by both the gallery index at
 * /graph and by each individual route's header/footer navigation.
 */

import type { VizVariant } from "./CommitGraph";

export interface VariantMeta {
  key: VizVariant;
  slug: string;
  numeral: string;
  name: string;
  tagline: string;
  description: string;
}

export const VARIANTS: VariantMeta[] = [
  {
    key: "constellation",
    slug: "constellation",
    numeral: "I",
    name: "Constellation",
    tagline: "Stars traced by hairline threads",
    description:
      "Commits as luminous points in 3D space, branches traced as thin constellation lines between them. The main branch is a bright central ridge; side branches peel off into their own sub-constellations.",
  },
  {
    key: "tree",
    slug: "tree",
    numeral: "II",
    name: "Growing Tree",
    tagline: "A trunk of main, limbs of branches",
    description:
      "A literal tree with a central coral trunk running up the time axis. Every side branch curves outward from the trunk where it split and follows its own path into 3D space.",
  },
  {
    key: "lanterns",
    slug: "lanterns",
    numeral: "III",
    name: "Lantern Procession",
    tagline: "Glowing columns of warm lanterns",
    description:
      "Each branch becomes a vertical column of warm-glowing lantern spheres with gold threads between sequential commits. Main branch at the center, side branches as columns at small radial offsets.",
  },
  {
    key: "nebula",
    slug: "nebula",
    numeral: "IV",
    name: "Nebular Cloud",
    tagline: "Structure emerging from a particle cloud",
    description:
      "Commits as particles scattered in a diffuse cloud. Main branch forms a bright wavering filament through the center; side branches are organic wisps trailing through the cloud's volume.",
  },
  {
    key: "helix",
    slug: "helix",
    numeral: "V",
    name: "Helix",
    tagline: "A spiral around a central axis",
    description:
      "The entire commit history rendered as a single spiral ascending the vertical axis — five turns from the first commit to the latest. Side branches spiral at larger radii around the same axis.",
  },
  {
    key: "orbital",
    slug: "orbital",
    numeral: "VI",
    name: "Orbital Rings",
    tagline: "Concentric rings at stacked heights",
    description:
      "Each branch is a horizontal ring at its own Y level with its own radius. Commits are beads positioned around their ring by time. Ten levels stacked vertically, rings at varying radii.",
  },
  {
    key: "cathedral",
    slug: "cathedral",
    numeral: "VII",
    name: "Cathedral Tiers",
    tagline: "Five stacked floors, one per phase",
    description:
      "Five horizontal tiers stacked vertically, one per phase of the project's timeline. Commits on each floor spiral outward from the center. Faint gold squares outline the boundary of each tier.",
  },
  {
    key: "lattice",
    slug: "lattice",
    numeral: "VIII",
    name: "Crystal Lattice",
    tagline: "Commits on an orthogonal 3D grid",
    description:
      "Every commit snaps to an intersection on a 12×12×12 orthogonal grid. Time drives the vertical axis, branch index drives the horizontal. Commits render as small metallic cubes rather than spheres.",
  },
];

export function getVariantBySlug(slug: string): VariantMeta | undefined {
  return VARIANTS.find((v) => v.slug === slug);
}

export function getVariantIndex(key: VizVariant): number {
  return VARIANTS.findIndex((v) => v.key === key);
}
