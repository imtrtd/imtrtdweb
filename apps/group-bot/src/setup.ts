import { Ctx, webhookSecret } from "./env";

const PRIVATE_COMMANDS = [
  { command: "start", description: "Начать" },
  { command: "help", description: "Что умеет бот" },
  { command: "remind", description: "Напоминание: 18:30 текст / через 10 мин текст" },
  { command: "reminders", description: "Мои напоминания" },
  { command: "delremind", description: "Удалить напоминание по ID" },
];

export const OWNER_COMMANDS = [
  ...PRIVATE_COMMANDS,
  { command: "business", description: "Автоответы Business: статус / on / off / ai on|off" },
  { command: "setautoreply", description: "Текст автоответа" },
  { command: "pause", description: "Пауза автоответов на N минут" },
  { command: "cooldown", description: "Повтор шаблона не чаще, чем раз в H ч" },
];

const MEMBER_COMMANDS = [
  { command: "help", description: "Справка" },
  { command: "rules", description: "Правила чата" },
  { command: "remind", description: "Напоминание: 18:30 текст / через 10 мин текст" },
  { command: "reminders", description: "Активные напоминания" },
  { command: "delremind", description: "Удалить напоминание по ID" },
];

const ADMIN_COMMANDS = [
  ...MEMBER_COMMANDS,
  { command: "settings", description: "Текущие настройки" },
  { command: "set", description: "Изменить настройку (капча, флуд, ссылки…)" },
  { command: "setwelcome", description: "Текст приветствия" },
  { command: "setrules", description: "Задать правила" },
  { command: "warn", description: "Предупреждение (ответом; 3 → мут 24 ч)" },
  { command: "unwarn", description: "Снять предупреждение (ответом)" },
  { command: "mute", description: "Мут [мин] (ответом)" },
  { command: "unmute", description: "Снять мут (ответом)" },
  { command: "ban", description: "Бан (ответом)" },
  { command: "unban", description: "Разбан (ответом или ID)" },
  { command: "del", description: "Удалить сообщение (ответом)" },
  { command: "addword", description: "Добавить запрещённое слово" },
  { command: "delword", description: "Убрать запрещённое слово" },
  { command: "words", description: "Список запрещённых слов" },
];

export const ALLOWED_UPDATES = [
  "message", "edited_message", "callback_query", "my_chat_member",
  "business_connection", "business_message", "edited_business_message", "deleted_business_messages",
];

export const webhookUrl = (c: Ctx) => `${c.env.PUBLIC_URL}/telegram/webhook`;

export async function runSetup(c: Ctx): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const step = async (name: string, method: string, params: Record<string, unknown>) => {
    try { await c.tg.call(method, params); out[name] = "ok"; }
    catch (e) { out[name] = String((e as Error).message); }
  };
  await step("webhook", "setWebhook", {
    url: webhookUrl(c), secret_token: (await webhookSecret(c.env)).slice(0, 64),
    allowed_updates: ALLOWED_UPDATES, drop_pending_updates: false, max_connections: 40,
  });
  await step("commands_default", "setMyCommands", { commands: PRIVATE_COMMANDS, scope: { type: "default" } });
  await step("commands_private", "setMyCommands", { commands: PRIVATE_COMMANDS, scope: { type: "all_private_chats" } });
  await step("commands_groups", "setMyCommands", { commands: MEMBER_COMMANDS, scope: { type: "all_group_chats" } });
  await step("commands_admins", "setMyCommands", { commands: ADMIN_COMMANDS, scope: { type: "all_chat_administrators" } });
  const owners = new Set<number>();
  if (c.env.OWNER_ID) owners.add(Number(c.env.OWNER_ID));
  const stored = Number(await c.db.getKv("owner_id"));
  if (stored) owners.add(stored);
  for (const id of owners) await step(`commands_owner_${id}`, "setMyCommands", { commands: OWNER_COMMANDS, scope: { type: "chat", chat_id: id } });
  await step("description", "setMyDescription", {
    description: "IMTRTD Group Automation — бот для групп: приветствие и правила, капча «Я не бот», антиспам (ссылки, флуд, запрещённые слова), модерация (/warn, /mute, /ban) и напоминания (время Киева).",
  });
  await step("short_description", "setMyShortDescription", { short_description: "Приветствие, капча, антиспам, модерация и напоминания для групп" });
  return out;
}
