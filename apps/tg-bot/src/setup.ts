import { Ctx, webhookSecret } from "./env";

const MEMBER_COMMANDS = [
  { command: "help", description: "Справка по командам" },
  { command: "ask", description: "Задать вопрос ИИ" },
  { command: "list", description: "Списки: new / add / done / show" },
  { command: "lists", description: "Все списки чата" },
  { command: "poll", description: "Опрос: Вопрос | вар1 | вар2" },
  { command: "task", description: "Задача: текст [@user] [когда]" },
  { command: "tasks", description: "Открытые задачи" },
  { command: "done", description: "Отметить задачу выполненной" },
  { command: "warns", description: "Мои предупреждения" },
  { command: "app", description: "Открыть панель (Mini App)" },
];

const ADMIN_COMMANDS = [
  ...MEMBER_COMMANDS,
  { command: "ban", description: "Забанить (ответом)" },
  { command: "unban", description: "Разбанить" },
  { command: "mute", description: "Мут [30m|2h|1d] (ответом)" },
  { command: "unmute", description: "Снять мут" },
  { command: "warn", description: "Предупреждение (3 → мут)" },
  { command: "unwarn", description: "Снять предупреждение" },
  { command: "del", description: "Удалить сообщение (ответом)" },
  { command: "topic", description: "Темы: create / close / reopen / rename" },
  { command: "settings", description: "Настройки чата" },
  { command: "antispam", description: "Антиспам: on/off/links/flood" },
  { command: "welcome", description: "Текст приветствия" },
];

const PRIVATE_COMMANDS = [
  { command: "start", description: "Начать" },
  { command: "app", description: "Открыть панель управления" },
  { command: "help", description: "Справка" },
];

export const ALLOWED_UPDATES = ["message", "callback_query", "chat_member", "my_chat_member"];

export async function runSetup(c: Ctx): Promise<Record<string, unknown>> {
  const base = c.env.PUBLIC_URL;
  const out: Record<string, unknown> = {};
  const step = async (name: string, method: string, params: Record<string, unknown>) => {
    try { await c.tg.call(method, params); out[name] = "ok"; }
    catch (e) { out[name] = String((e as Error).message); }
  };
  await step("webhook", "setWebhook", {
    url: `${base}/telegram/webhook`, secret_token: (await webhookSecret(c.env)).slice(0, 64),
    allowed_updates: ALLOWED_UPDATES, drop_pending_updates: true, max_connections: 40,
  });
  await step("commands_default", "setMyCommands", { commands: PRIVATE_COMMANDS, scope: { type: "default" } });
  await step("commands_private", "setMyCommands", { commands: PRIVATE_COMMANDS, scope: { type: "all_private_chats" } });
  await step("commands_groups", "setMyCommands", { commands: MEMBER_COMMANDS, scope: { type: "all_group_chats" } });
  await step("commands_admins", "setMyCommands", { commands: ADMIN_COMMANDS, scope: { type: "all_chat_administrators" } });
  await step("description", "setMyDescription", {
    description: "Grok Assistant — помощник для групп: модерация и антиспам, темы, списки с галочками, опросы, задачи с напоминаниями (время Киева) и ответы ИИ на упоминание. Панель управления — кнопка «Панель».",
  });
  await step("short_description", "setMyShortDescription", { short_description: "Модерация, списки, задачи, опросы и ИИ для вашей группы" });
  await step("menu_button", "setChatMenuButton", { menu_button: { type: "web_app", text: "Панель", web_app: { url: `${base}/app` } } });
  return out;
}
