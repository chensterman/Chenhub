export interface BucketListItem {
	id: string;
	title: string;
	description: string | null;
	tags: string[];
	created_by: string;
	created_at: string;
	updated_at: string;
	completed_at: string | null;
	memory_count?: number;
}

export interface BucketListMemory {
	id: string;
	bucket_list_item_id: string;
	scrapbook_entry_id: string;
	created_at: string;
}
