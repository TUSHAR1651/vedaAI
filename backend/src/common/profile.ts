/**
 * Static teacher / school profile.
 *
 * The spec keeps auth out of scope, so there is a single hard-coded profile.
 * It powers the sidebar identity (frontend mirrors these values) and the
 * school-branded header printed on every generated paper / PDF.
 */
export const PROFILE = {
  teacherName: 'John Doe',
  schoolName: 'Delhi Public School, Sector-4',
  schoolAddress: 'Bokaro Steel City',
} as const;
