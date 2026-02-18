import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: letter, error: fetchError } = await locals.supabase
		.from('letters')
		.select('*')
		.eq('id', params.id)
		.single();

	if (fetchError || !letter) {
		error(404, 'Letter not found');
	}

	const { data: profiles } = await locals.supabase
		.from('profiles')
		.select('id, email');

	const userNames: Record<string, string> = {};
	for (const p of profiles ?? []) {
		userNames[p.id] = p.email.split('@')[0];
	}

	return { letter, userNames };
};
