// Run with node tests/closure-regressions.mjs. Uses the existing Vite/esbuild dependency.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const result = await build({
  stdin: { contents: `
    import assert from 'node:assert/strict';
    import { test } from 'node:test';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { RuleRegistry } from './src/features/haqverse/rules/RuleRegistry';
    import { createPlannerItem, updatePlannerItem, listPlannerItems } from './src/lib/planner';
    const values = new Map();
    globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)) };
    test('status-only Planner updates retain the saved due date', () => {
      const item = createPlannerItem({ title: 'Dated task', dueDate: '2026-10-22' });
      updatePlannerItem(item.id, { status: 'doing' });
      assert.equal(listPlannerItems().find(x => x.id === item.id).dueDate, '2026-10-22');
      updatePlannerItem(item.id, { dueDate: '' });
      assert.equal(listPlannerItems().find(x => x.id === item.id).dueDate, undefined);
    });
    test('persisted World Rules without optional philosophy retain world identity', () => {
      values.set('qah:haqverse:regression:world-rules', JSON.stringify([{
        id:'world-minimal', projectId:'regression', name:'Minimal world', continuityTag:'@WORLD',
        status:'DRAFT', createdAt:'2026-10-20T00:00:00.000Z', updatedAt:'2026-10-20T00:00:00.000Z', era:'Test era'
      }]));
      const markup = renderToStaticMarkup(createElement(RuleRegistry, { projectId:'regression' }));
      assert.ok(markup.includes('Test era'), 'World card must use its world fields after loading');
    });
  `, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  packages: 'external', tsconfig: 'tsconfig.json',
});
new Function('require', result.outputFiles[0].text)(createRequire(import.meta.url));
