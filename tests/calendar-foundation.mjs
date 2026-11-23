import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const bundle = await build({
  stdin: { contents: "export * from './src/lib/calendar'; export * from './src/lib/planner';", resolveDir: process.cwd() },
  platform: 'node', format: 'cjs', bundle: true, packages: 'external', write: false,
});

function open(values = new Map()) {
  const storage = {
    get length() { return values.size; },
    key: i => Array.from(values.keys())[i] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const module = { exports: {} };
  new Function('require', 'module', 'localStorage', bundle.outputFiles[0].text)(
    createRequire(import.meta.url), module, storage
  );
  return module.exports;
}

const workspace = { kind: 'workspace' };
const a = { kind: 'project', projectId: 'alpha' };
const b = { kind: 'project', projectId: 'alpha:other' };
const times = { startsAt: '2026-11-20T10:00:00+06:00', endsAt: '2026-11-20T11:00:00+06:00' };
const event = { kind: 'event', title: 'Review', ...times, recurrence: { frequency: 'weekly', interval: 2 } };

test('legacy deadline retains its identity and bytes across migration, scheduling and reload', () => {
  const legacy = JSON.stringify([{ id: 'original', title: 'Edit', notes: '', status: 'todo', dueDate: '2026-11-19', createdAt: 'old', updatedAt: 'old' }]);
  const values = new Map([['qah:planner', legacy]]);
  const api = open(values);
  const session = api.saveCalendarEntry(workspace, { kind: 'session', taskId: 'original', ...times });
  const calendar = open(values).listCalendar(workspace);
  assert.equal(calendar.deadlines[0].taskId, 'original');
  assert.equal(calendar.deadlines[0].dueDate, '2026-11-19');
  assert.deepEqual(calendar.entries, [session]);
  assert.equal(values.get('qah:planner'), legacy);
  api.updatePlannerItem('original', { dueDate: '' });
  assert.deepEqual(api.listCalendar(workspace), { deadlines: [], entries: [session] });
});

test('projects isolate task links, updates, event recurrence metadata and workspace deadlines', () => {
  const values = new Map();
  const api = open(values);
  const task = api.createPlannerItem({ title: 'Project task', dueDate: '2026-12-01' }, a.projectId);
  const session = { kind: 'session', taskId: task.id, ...times };
  api.saveCalendarEntry(a, session);
  const saved = api.saveCalendarEntry(a, event);
  assert.equal(api.listCalendar(a).deadlines[0].taskId, task.id);
  for (const other of [workspace, b]) {
    assert.deepEqual(api.listCalendar(other), { deadlines: [], entries: [] });
    assert.throws(() => api.saveCalendarEntry(other, session), /Task missing/);
    assert.throws(() => api.saveCalendarEntry(other, event, saved.id), /missing in this scope/);
  }
  assert.equal(open(values).listCalendar(a).entries.length, 2);
  assert.deepEqual(open(values).listCalendar(a).entries.find(item => item.id === saved.id).entry, event);
});

test('invalid edits, unknown versions and malformed legacy data survive failed writes', () => {
  const values = new Map();
  const api = open(values);
  const saved = api.saveCalendarEntry(a, event);
  assert.throws(() => api.saveCalendarEntry(a, { ...event, endsAt: times.startsAt }, saved.id));
  const key = [...values.keys()][0];
  const future = JSON.stringify({ ...saved, version: 2 });
  values.set(key, future);
  assert.throws(() => api.saveCalendarEntry(a, event, saved.id));
  assert.equal(values.get(key), future);
  values.set('qah:planner', '{');
  assert.throws(() => api.createPlannerItem({ title: 'New' }));
  assert.equal(values.get('qah:planner'), '{');
});
