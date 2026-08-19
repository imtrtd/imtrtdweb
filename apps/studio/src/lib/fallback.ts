import type { SiteContent } from "../types";

export const FALLBACK_CONTENT: SiteContent = {
	copy: {
		brand: "I'm Trying To Design",
		headline: "Дизайн, который держит продукт вместе",
		subhead:
			"Студия цифрового дизайна: брендинг, интерфейсы и визуальные системы для команд, которым нужен ясный результат.",
		cta_label: "Оставить заявку",
		contact_email: "hello@imtryingtodesign.com",
		contact_telegram: "@imtrtd",
	},
	cases: [
		{
			id: "case-north",
			title: "Northline",
			role: "Бренд + сайт",
			result: "Собран визуальный язык и лендинг для B2B-платформы.",
			image_url: "",
			sort_order: 1,
			published: 1,
			created_at: "",
			updated_at: "",
		},
		{
			id: "case-orbit",
			title: "Orbit Pay",
			role: "Product UI",
			result: "Упрощён онбординг и ключевые экраны платежного кабинета.",
			image_url: "",
			sort_order: 2,
			published: 1,
			created_at: "",
			updated_at: "",
		},
		{
			id: "case-atelier",
			title: "Atelier 12",
			role: "Брендинг",
			result: "Идентичность для студии пространства и набор носителей.",
			image_url: "",
			sort_order: 3,
			published: 1,
			created_at: "",
			updated_at: "",
		},
		{
			id: "case-signal",
			title: "Signal Desk",
			role: "Лендинг",
			result: "Конверсионная посадочная для аналитического инструмента.",
			image_url: "",
			sort_order: 4,
			published: 1,
			created_at: "",
			updated_at: "",
		},
	],
	services: [
		{
			id: "svc-brand",
			title: "Брендинг",
			description:
				"Идентичность, голос и визуальная система, с которой продукт узнаваем.",
			sort_order: 1,
			published: 1,
			created_at: "",
			updated_at: "",
		},
		{
			id: "svc-product",
			title: "Product UI",
			description:
				"Интерфейсы продуктов и кабинетов: структура, состояния, аккуратная детализация.",
			sort_order: 2,
			published: 1,
			created_at: "",
			updated_at: "",
		},
		{
			id: "svc-landing",
			title: "Лендинги",
			description:
				"Посадочные с ясным героем, одним CTA и сильной визуальной подачей.",
			sort_order: 3,
			published: 1,
			created_at: "",
			updated_at: "",
		},
		{
			id: "svc-system",
			title: "Дизайн-системы",
			description:
				"Токены, компоненты и правила, чтобы команда масштабировалась без хаоса.",
			sort_order: 4,
			published: 1,
			created_at: "",
			updated_at: "",
		},
	],
};
