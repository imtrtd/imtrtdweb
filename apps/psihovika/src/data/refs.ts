import type { Test } from "@/data/build";

export type Fidelity = "official" | "adapted" | "construct" | "teaching";

export type Citation = {
  authors: string;
  year: number | string;
  title: string;
  venue?: string;
  note?: string;
  url?: string;
};

export type MethodMeta = {
  fidelity: Fidelity;
  instrument?: string;
  citations: Citation[];
  primaryNote?: string;
};

export const FIDELITY_LABEL: Record<Fidelity, string> = {
  official: "Публичная шкала",
  adapted: "Адаптированная формулировка",
  construct: "По конструкту автора",
  teaching: "Учебный профиль",
};

const META: Record<string, MethodMeta> = {
  phq9: {
    fidelity: "official",
    instrument: "Patient Health Questionnaire-9 (PHQ-9)",
    citations: [
      {
        authors: "Kroenke K., Spitzer R. L., Williams J. B.",
        year: 2001,
        title: "The PHQ-9: validity of a brief depression severity measure",
        venue: "J Gen Intern Med, 16(9), 606–613",
        url: "https://doi.org/10.1046/j.1525-1497.2001.016009606.x",
      },
    ],
    primaryNote: "Общественное достояние. Пороги 5 / 10 / 15 / 20 как у авторов.",
  },
  gad7: {
    fidelity: "official",
    instrument: "Generalized Anxiety Disorder-7 (GAD-7)",
    citations: [
      {
        authors: "Spitzer R. L., Kroenke K., Williams J. B., Löwe B.",
        year: 2006,
        title: "A brief measure for assessing generalized anxiety disorder: the GAD-7",
        venue: "Arch Intern Med, 166(10), 1092–1097",
        url: "https://doi.org/10.1001/archinte.166.10.1092",
      },
    ],
    primaryNote: "Общественное достояние. Пороги 5 / 10 / 15.",
  },
  phq4: {
    fidelity: "official",
    instrument: "Patient Health Questionnaire-4 (PHQ-4)",
    citations: [
      {
        authors: "Kroenke K., Spitzer R. L., Williams J. B., Löwe B.",
        year: 2009,
        title: "An ultra-brief screening scale for anxiety and depression: the PHQ-4",
        venue: "Psychosomatics, 50(6), 613–621",
        url: "https://doi.org/10.1176/appi.psy.50.6.613",
      },
    ],
  },
  who5: {
    fidelity: "official",
    instrument: "WHO-5 Well-Being Index",
    citations: [
      {
        authors: "World Health Organization",
        year: 1998,
        title: "Wellbeing measures in primary health care: the DepCare project",
        venue: "WHO Regional Office for Europe",
        url: "https://www.who.int/publications/m/item/WHO-EURO-1998-41432-56470",
      },
    ],
  },
  dass21: {
    fidelity: "official",
    instrument: "DASS-21",
    citations: [
      {
        authors: "Lovibond S. H., Lovibond P. F.",
        year: 1995,
        title: "Manual for the Depression Anxiety Stress Scales",
        venue: "Psychology Foundation of Australia",
        note: "Публичная шкала; умножение сырых субшкал ×2 как в руководстве.",
      },
    ],
  },
  audit: {
    fidelity: "official",
    instrument: "AUDIT",
    citations: [
      {
        authors: "Saunders J. B., Aasland O. G., Babor T. F., de la Fuente J. R., Grant M.",
        year: 1993,
        title: "Development of the Alcohol Use Disorders Identification Test (AUDIT)",
        venue: "Addiction, 88(6), 791–804",
        url: "https://doi.org/10.1111/j.1360-0443.1993.tb02093.x",
      },
    ],
  },
  pcl5: {
    fidelity: "official",
    instrument: "PCL-5",
    citations: [
      {
        authors: "Weathers F. W., Litz B. T., Keane T. M., Palmieri P. A., Marx B. P., Schnurr P. P.",
        year: 2013,
        title: "The PTSD Checklist for DSM-5 (PCL-5)",
        venue: "National Center for PTSD",
        url: "https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp",
      },
    ],
  },
  "ipip-50": {
    fidelity: "official",
    instrument: "IPIP Big-Five Factor Markers (50)",
    citations: [
      {
        authors: "Goldberg L. R.",
        year: 1992,
        title: "The development of markers for the Big-Five factor structure",
        venue: "Psychological Assessment, 4(1), 26–42",
        url: "https://ipip.ori.org/",
      },
    ],
    primaryNote: "Общественное достояние. Это не NEO-PI-R и не популяционные нормы.",
  },
  "att-profile": {
    fidelity: "construct",
    instrument: "Стили привязанности ( Bartholomew & Horowitz )",
    citations: [
      {
        authors: "Bartholomew K., Horowitz L. M.",
        year: 1991,
        title: "Attachment styles among young adults",
        venue: "J Pers Soc Psychol, 61(2), 226–244",
      },
      {
        authors: "Brennan K. A., Clark C. L., Shaver P. R.",
        year: 1998,
        title: "Self-report measurement of adult attachment",
        venue: "Attachment theory and close relationships",
        note: "Учебный профиль по конструкту, не ECR-R дословно.",
      },
    ],
  },
  "def-immature": {
    fidelity: "construct",
    instrument: "Защитные механизмы (Vaillant)",
    citations: [
      {
        authors: "Vaillant G. E.",
        year: 1992,
        title: "Ego Mechanisms of Defense: A Guide for Clinicians and Researchers",
        venue: "American Psychiatric Press",
        note: "Учебные пункты по иерархии Вайланта, не опросник DSQ.",
      },
    ],
  },
  "def-mature": {
    fidelity: "construct",
    instrument: "Зрелые защиты (Vaillant)",
    citations: [
      {
        authors: "Vaillant G. E.",
        year: 1992,
        title: "Ego Mechanisms of Defense",
        venue: "American Psychiatric Press",
      },
    ],
  },
};

function inferFidelity(test: Test): Fidelity {
  if (test.gold) return "official";
  const src = test.source.toLowerCase();
  if (src.includes("учебн")) return "teaching";
  if (src.includes("конструкт") || src.includes("это не ")) return "construct";
  return "adapted";
}

/**
 * Pull `Author (1990)` / `Author (1935, 1940)` from free-text sources.
 * Rejects paren groups that are only year lists like `(1975, 1984)`, where the
 * old parser stored the first year as `authors`.
 */
function parseCitationFromSource(source: string): Citation | null {
  const yearGroup = /\(([12]\d{3})(?:\s*[,/]\s*[12]\d{3})*\)/g;
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = yearGroup.exec(source)) !== null) last = match;
  if (!last) return null;

  const year = last[1];
  const before = source.slice(0, last.index).trim().replace(/[,:\s]+$/u, "");
  // Prefer the clause after the last comma ("…, Klein (1935, 1940)").
  const chunk = (
    before.includes(",") ? before.slice(before.lastIndexOf(",") + 1) : before
  )
    .trim()
    .replace(/^(?:и|and|&)\s+/iu, "")
    .trim();
  if (chunk.length < 2 || /^\d{4}\b/.test(chunk)) return null;
  // Authors are Latin names or a capitalized surname — not prose like "отчёт".
  const looksLikeAuthor =
    /[A-Za-z]/.test(chunk) ||
    /(?:^|\s)[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё'`.\-]+$/u.test(chunk);
  if (!looksLikeAuthor) return null;

  return {
    authors: chunk,
    year,
    title: source,
    note: "Разобрано из поля источника методики.",
  };
}

export function metaFor(test: Test): MethodMeta {
  const known = META[test.id];
  if (known) return known;
  const parsed = parseCitationFromSource(test.source);
  return {
    fidelity: inferFidelity(test),
    citations: parsed ? [parsed] : [],
  };
}

export function enrichTest(test: Test): Test & { meta: MethodMeta } {
  return { ...test, meta: metaFor(test) };
}
