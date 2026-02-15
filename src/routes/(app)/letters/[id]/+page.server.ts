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

	return { letter };
};
