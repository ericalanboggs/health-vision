/**
 * Bounded static-string localization for the SMS coaching loop (Localization Workstream D).
 *
 * Only the fixed, hardcoded strings that ship to users in-language live here — the AI-generated
 * coaching text is localized separately via languageDirective (Workstream B). Keep this set
 * SMALL and hot-path; do not boil the whole string ocean.
 *
 *   t('key', lang, { name: 'Ana' })  →  interpolates {name} into the lang string.
 *
 * ⚠️ SAFETY/QUALITY GATE: the es / pt-BR strings below are best-effort and MUST be reviewed by
 * a native speaker (Eric) before enrolling users. Product keywords that trigger routing
 * (ADD, BACKUP, ARCHIVE, STOP, HELP) are kept English on purpose — pilot users are briefed.
 */

type Lang = string
type Vars = Record<string, string | number>

// key → { en, es, pt-BR }. Missing lang falls back to en.
const STRINGS: Record<string, Record<string, string>> = {
  // ── Motivation Mode — welcome (send-motivation-welcome) ──────────────────
  motivation_welcome: {
    en: `Welcome to Summit 🌱 Here's what to expect: one short text a day with a little inspiration around {focus}. No tracking, no judgment — just small nudges to get you moving. Every so often I'll check in to see if you'd like to turn one into a small habit — but there's zero pressure to reply, ever. Everyone's on their own journey, at their own pace, and yours is exactly right.`,
    es: `Bienvenido/a a Summit 🌱 Esto es lo que puedes esperar: un mensaje corto al día con un poco de inspiración sobre {focus}. Sin seguimiento, sin juicios — solo pequeños empujones para ayudarte a avanzar. De vez en cuando te preguntaré si quieres convertir alguno en un pequeño hábito, pero nunca hay ninguna presión por responder. Cada quien lleva su propio camino, a su propio ritmo, y el tuyo está perfecto.`,
    'pt-BR': `Bem-vindo/a ao Summit 🌱 Veja o que esperar: uma mensagem curta por dia com um pouco de inspiração sobre {focus}. Sem rastreamento, sem julgamento — só pequenos incentivos para te ajudar a começar. De vez em quando vou perguntar se você quer transformar algum deles num pequeno hábito, mas nunca há pressão para responder. Cada um tem sua própria jornada, no seu próprio ritmo, e o seu está exatamente certo.`,
  },
  motivation_welcome_focus_fallback: {
    en: `what matters to you`,
    es: `lo que te importa`,
    'pt-BR': `o que importa para você`,
  },

  // ── Motivation Mode — weekly check-in (send-daily-motivation opener) ──────
  motivation_checkin_opener: {
    en: `Hey {name} — checking in on the week. How's the content been landing? Anything you'd want more of, less of, or different as it continues next week?`,
    es: `Hola {name} — un pequeño chequeo de la semana. ¿Qué tal te ha caído el contenido? ¿Algo que quieras más, menos o diferente para la próxima semana?`,
    'pt-BR': `Oi {name} — passando para ver como foi a semana. Como o conteúdo tem chegado até você? Tem algo que gostaria de receber mais, menos ou diferente na próxima semana?`,
  },
  motivation_checkin_ruler: {
    en: `Thank you — that helps me shape next week. One more, no pressure: on a scale of 1–10, how ready do you feel to try one small habit? (1 = not at all, 10 = ready)`,
    es: `Gracias — eso me ayuda a preparar la próxima semana. Una más, sin presión: del 1 al 10, ¿qué tan listo/a te sientes para probar un pequeño hábito? (1 = nada, 10 = listo/a)`,
    'pt-BR': `Obrigado — isso me ajuda a preparar a próxima semana. Mais uma, sem pressão: de 1 a 10, quão pronto/a você se sente para tentar um pequeno hábito? (1 = nada, 10 = pronto/a)`,
  },
  motivation_ruler_reprompt: {
    en: `No worries — just a number 1–10 for me: how ready do you feel to try one small habit? (1 = not at all, 10 = ready)`,
    es: `Tranquilo/a — solo un número del 1 al 10: ¿qué tan listo/a te sientes para probar un pequeño hábito? (1 = nada, 10 = listo/a)`,
    'pt-BR': `Sem problema — só um número de 1 a 10: quão pronto/a você se sente para tentar um pequeno hábito? (1 = nada, 10 = pronto/a)`,
  },
  motivation_handoff_offer: {
    en: `Honestly, {name}, you sound ready. Want to turn one of these into a real habit you'll actually keep? Reply YES and we'll set it together — small, I promise.`,
    es: `La verdad, {name}, suenas listo/a. ¿Quieres convertir uno de estos en un hábito real que de verdad mantengas? Responde SÍ y lo armamos juntos — pequeño, te lo prometo.`,
    'pt-BR': `Sinceramente, {name}, você parece pronto/a. Quer transformar um destes num hábito de verdade, que você realmente mantenha? Responda SIM e a gente monta juntos — pequeno, prometo.`,
  },
  motivation_close_score: {
    en: `Got it — {score}/10. Thank you, {name}. This helps me send you better stuff. Talk soon. 🌿`,
    es: `Anotado — {score}/10. Gracias, {name}. Esto me ayuda a enviarte mejores cosas. Hablamos pronto. 🌿`,
    'pt-BR': `Anotado — {score}/10. Obrigado, {name}. Isso me ajuda a te enviar coisas melhores. Falamos em breve. 🌿`,
  },
  motivation_close_noscore: {
    en: `All good, {name} — thank you. This helps me send you better stuff. Talk soon. 🌿`,
    es: `Todo bien, {name} — gracias. Esto me ayuda a enviarte mejores cosas. Hablamos pronto. 🌿`,
    'pt-BR': `Tudo certo, {name} — obrigado. Isso me ajuda a te enviar coisas melhores. Falamos em breve. 🌿`,
  },
  motivation_ready_opener: {
    en: `Love hearing that, {name}. Want to set one small habit together? Reply YES and we'll start — or NO worries if it's not the moment.`,
    es: `Me encanta oír eso, {name}. ¿Quieres armar un pequeño hábito juntos? Responde SÍ y empezamos — o tranquilo/a si no es el momento.`,
    'pt-BR': `Adorei ouvir isso, {name}. Quer montar um pequeno hábito juntos? Responda SIM e a gente começa — ou sem problema se não for a hora.`,
  },
  motivation_handoff_decline: {
    en: `Totally fine, {name} — no rush at all. I'll keep the inspiration coming, and we can set a habit whenever you're ready. 🌿`,
    es: `Totalmente bien, {name} — sin ninguna prisa. Seguiré enviándote inspiración, y armamos un hábito cuando tú quieras. 🌿`,
    'pt-BR': `Tudo tranquilo, {name} — sem pressa nenhuma. Vou continuar te mandando inspiração, e a gente monta um hábito quando você quiser. 🌿`,
  },
  motivation_add_handoff: {
    en: `Love it. Let's set your first small habit together. Reply: ADD <the habit> — e.g. "ADD 10-minute walk after lunch". Keep it tiny on purpose.`,
    es: `Me encanta. Armemos juntos tu primer pequeño hábito. Responde: ADD <el hábito> — por ejemplo "ADD caminata de 10 minutos después de comer". Que sea pequeño a propósito.`,
    'pt-BR': `Adorei. Vamos montar juntos seu primeiro pequeno hábito. Responda: ADD <o hábito> — por exemplo "ADD caminhada de 10 minutos depois do almoço". Mantenha bem pequeno de propósito.`,
  },

  // ── Signup path (Workstream F) ───────────────────────────────────────────
  otp_code: {
    en: `Your Summit verification code is: {code}. It expires in 10 minutes.`,
    es: `Tu código de verificación de Summit es: {code}. Expira en 10 minutos.`,
    'pt-BR': `Seu código de verificação do Summit é: {code}. Ele expira em 10 minutos.`,
  },
  optin_confirm: {
    en: `Welcome to Summit Health SMS Coaching! You are now subscribed to recurring messages. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel.`,
    es: `¡Bienvenido/a al Coaching por SMS de Summit Health! Ya estás suscrito/a a mensajes recurrentes. La frecuencia varía. Pueden aplicar tarifas de mensajes y datos. Responde HELP para ayuda, STOP para cancelar.`,
    'pt-BR': `Bem-vindo/a ao Coaching por SMS da Summit Health! Você agora está inscrito/a para receber mensagens recorrentes. A frequência varia. Podem incidir tarifas de mensagem e dados. Responda HELP para ajuda, STOP para cancelar.`,
  },
  compliance_stop_footer: {
    en: `Reply STOP to opt out.`,
    es: `Responde STOP para cancelar.`,
    'pt-BR': `Responda STOP para cancelar.`,
  },
  help_response: {
    en: `Summit Health Habit Reminders: For help, visit go.summithealth.app or email hello@summithealth.app. Msg & data rates may apply. Msg frequency varies. Reply STOP to cancel.`,
    es: `Recordatorios de Hábitos de Summit Health: Para ayuda, visita go.summithealth.app o escribe a hello@summithealth.app. Pueden aplicar tarifas de mensajes y datos. La frecuencia varía. Responde STOP para cancelar.`,
    'pt-BR': `Lembretes de Hábitos da Summit Health: Para ajuda, acesse go.summithealth.app ou escreva para hello@summithealth.app. Podem incidir tarifas de mensagem e dados. A frequência varia. Responda STOP para cancelar.`,
  },
}

/** Look up a localized string by key, interpolating {var} placeholders. Falls back to en. */
export function t(key: string, lang: Lang = 'en', vars: Vars = {}): string {
  const entry = STRINGS[key]
  if (!entry) return key // surfaces a missing key loudly rather than silently blanking
  let s = entry[lang] || entry.en || ''
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v))
  }
  return s
}
