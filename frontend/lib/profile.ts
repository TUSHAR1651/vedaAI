/**
 * Static profile mirrored from the backend (`backend/src/common/profile.ts`).
 * The spec keeps auth out of scope — one hard-coded teacher + school.
 */
export const PROFILE = {
  teacherName: 'John Doe',
  schoolName: 'Delhi Public School',
  schoolAddress: 'Bokaro Steel City',
  schoolFullName: 'Delhi Public School, Sector-4, Bokaro',
} as const;
