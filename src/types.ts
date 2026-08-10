export type LeadStatus = "new" | "in_progress" | "done" | "archived";
export type AdminRole = "owner" | "editor";

export type Lead = {
	id: string;
	name: string;
	contact: string;
	task_type: string;
	budget: string;
	message: string;
	status: LeadStatus;
	note: string;
	next_step: string;
	brief_url: string;
	first_response_at: string | null;
	reminded_at: string | null;
	created_at: string;
	updated_at: string;
};

export type LeadStats = {
	total: number;
	week: number;
	new_count: number;
	in_progress: number;
	stale_over_24h: number;
};

export type CaseItem = {
	id: string;
	title: string;
	role: string;
	result: string;
	image_url: string;
	sort_order: number;
	published: number;
	created_at: string;
	updated_at: string;
};

export type ServiceItem = {
	id: string;
	title: string;
	description: string;
	sort_order: number;
	published: number;
	created_at: string;
	updated_at: string;
};

export type SiteContent = {
	copy: Record<string, string>;
	cases: CaseItem[];
	services: ServiceItem[];
};

export type LeadPayload = {
	name: string;
	contact: string;
	task_type: string;
	budget: string;
	message: string;
	website?: string;
};
