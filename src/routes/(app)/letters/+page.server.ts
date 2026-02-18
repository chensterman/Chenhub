import { getPaginationParams, buildPaginationMeta } from '$lib/utils/pagination.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { page, limit, offset } = getPaginationParams(url, 20);

	// Get total count
	const { count, error: countError } = await locals.supabase
		.from('letters')
		.select('*', { count: 'exact', head: true });

	if (countError) {
		return {
			letters: [],
			pagination: buildPaginationMeta(0, page, limit),
		};
	}

	// Get paginated letters
	const { data: letters, error } = await locals.supabase
		.from('letters')
		.select('id, title, content, created_at, updated_at, created_by')
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	const { data: profiles } = await locals.supabase
		.from('profiles')
		.select('id, email');

	const userNames: Record<string, string> = {};
	for (const p of profiles ?? []) {
		userNames[p.id] = p.email.split('@')[0];
	}

	return {
		letters: letters ?? [],
		pagination: buildPaginationMeta(count ?? 0, page, limit),
		userNames,
	};
};
