import type { LayoutLoad } from './$types';
import { createSupabaseBrowserClient } from '$lib/supabase/client';

export const load: LayoutLoad = async ({ data }) => {
	const supabase = createSupabaseBrowserClient();
	const session = data.session;

	return { supabase, session };
};
