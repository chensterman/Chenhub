export interface BucketListItem {
	id: string;
	title: string;
	description: string | null;
	tags: string[];
	created_by: string;
	created_at: string;
	updated_at: string;
}
