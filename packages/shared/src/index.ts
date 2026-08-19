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

export const BRAND = {
	name: "I'm Trying To Design",
	email: "hello@imtryingtodesign.com",
	telegram: "@imtrtd",
	domain: "imtryingtodesign.com",
} as const;
