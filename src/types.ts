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

export type StepStatus =
	| "pending"
	| "running"
	| "waiting"
	| "completed"
	| "error";
export type WorkflowStatus = "idle" | "running" | "completed" | "error";

export interface StepDefinition {
	id: string;
	name: string;
	description: string;
	lineRange: [number, number];
}

export interface WorkflowState {
	instanceId: string | null;
	currentStep: string | null;
	stepStatuses: Record<string, StepStatus>;
	workflowStatus: WorkflowStatus;
	wsConnected: boolean;
}

export interface WorkflowUpdateMessage {
	type: "workflow_update";
	currentStep: string | null;
	stepStatuses: Record<string, StepStatus>;
	workflowStatus: "running" | "completed" | "error";
	timestamp: number;
}

export const WORKFLOW_STEPS: StepDefinition[] = [
	{
		id: "process-data",
		name: "process data",
		description: "Break code into durable steps",
		lineRange: [3, 7],
	},
	{
		id: "wait-2-seconds",
		name: "wait 2 seconds",
		description: "Add time-based delays",
		lineRange: [9, 10],
	},
	{
		id: "wait-for-approval",
		name: "wait for approval",
		description: "Pause for external events",
		lineRange: [12, 16],
	},
	{
		id: "final",
		name: "final",
		description: "Use data from previous steps",
		lineRange: [18, 22],
	},
];
