'use server';

import 'server-only';

// This file's functionality has been moved to the client-side 
// in `src/app/admin/dashboard/settings/page.tsx` to provide 
// a more reliable and responsive user experience for bulk deletions.
export async function resetExamsAction(token: string) { return { success: false, error: 'Deprecated' }; }
export async function resetCoursesAction(token: string) { return { success: false, error: 'Deprecated' }; }
export async function resetStudentsAction(token: string) { return { success: false, error: 'Deprecated' }; }
