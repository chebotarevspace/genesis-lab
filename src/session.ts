import { configure, createWorld, defaults, replay, restore, save, step, type Config } from './engine';
export function createSession(post: (data: unknown) => void) {
let a = createWorld('GENESIS-042'), b = createWorld('GENESIS-042', { ...defaults, regeneration: 0.3 });
return (data: any) => {
  try {
    switch (data.type) {
      case 'step': step(a, data.count); if (data.compare) step(b, data.count); break;
      case 'reset': a = createWorld(data.seed, data.a); b = createWorld(data.seed, data.b); break;
      case 'configure': configure(data.target === 'A' ? a : b, data.patch as Partial<Config>); break;
      case 'replay': a = replay(a); b = replay(b); break;
      case 'export': post({ type: 'export', text: JSON.stringify({ format: 'genesis-session-v1', a: JSON.parse(save(a)), b: JSON.parse(save(b)), compare: data.compare }) }); return;
      case 'import': { if (data.text.length > 16_000_000) throw new Error('Файл слишком большой'); const session = JSON.parse(data.text); if (session.format !== 'genesis-session-v1' || typeof session.compare !== 'boolean') throw new Error('Неверный формат эксперимента'); const nextA = restore(JSON.stringify(session.a)), nextB = restore(JSON.stringify(session.b)); a = nextA; b = nextB; post({ type: 'imported', compare: session.compare }); break; }
    }
    post({ type: 'state', a, b });
  } catch (error) { post({ type: 'error', message: error instanceof Error ? error.message : 'Ошибка симуляции' }); }
};

}
