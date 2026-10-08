import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {migrate as somtodayMigration} from '../src/state/migrations';
import {migrate as magisterMigration} from '../magister/src/state/migrations';
import {digest} from '../shared/results/identity';
it('both provider entry points preserve a persisted v0.2.8 inventory without resetting keys',()=>{
 const legacy=JSON.parse(readFileSync('tests/fixtures/persisted-v0.2.8.json','utf8'));
 expect(somtodayMigration).toBe(magisterMigration);
 expect(somtodayMigration(legacy)).toEqual(legacy);
 expect(magisterMigration(structuredClone(legacy))).toEqual(legacy);
});
it('keeps the persisted result identity digest stable across the shared-core move',async()=>{
 expect(await digest('fixture-salt','fixture-scope','progression','fixture-result-a')).toBe('d85e07d02409c044d1e36e3cab85cfae35681b79fcbe2250a80e8e6078f58937');
});
