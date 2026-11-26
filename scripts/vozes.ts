/** Lista as vozes da sua conta ElevenLabs.  npm run vozes */
import { principal } from "./lib/comum";
import { listarVozes } from "./lib/elevenlabs";

principal(async () => {
  const vozes = await listarVozes();
  for (const v of vozes) {
    const l = v.labels ?? {};
    console.log(`${v.voice_id}  ${v.name.padEnd(28)} ${[l.gender, l.age, l.accent, l.use_case ?? l.description].filter(Boolean).join(", ")}`);
  }
  console.log(`\n${vozes.length} voz(es). Coloque a escolhida em ELEVENLABS_VOICE_ID no .env.`);
});
