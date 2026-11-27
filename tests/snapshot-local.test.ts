// tools/snapshot-local.sh - nhánh 429 THEO NGÀY -> nhờ GitHub Actions chụp (phiếu g2a0b, 28/11/2026).
// Dựng kho git tạm (origin trần + bản clone như kênh máy nhà), npx/gh/lượt dò Open-Meteo đều GIẢ, không gọi mạng.
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync, chmodSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../tools/snapshot-local.sh');
const D = '2030-01-02';
const roots: string[] = [];
afterAll(() => { for (const r of roots) rmSync(r, { recursive: true, force: true }); });

// Không để GIT_* của hook/commit thật lọt vào kho tạm (bài học chung: pre-commit hỏng commit thật).
function cleanEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env)) if (!k.startsWith('GIT_')) env[k] = v;
  return { ...env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t', ...extra };
}

function git(cwd: string, ...args: string[]) {
  const r = spawnSync('git', args, { cwd, env: cleanEnv({}), encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

interface Opt { probe: string; ghCommits?: boolean; ghBusy?: number; waits?: string }
function run(o: Opt) {
  const root = mkdtempSync(join(tmpdir(), 'ch-snaplocal-'));
  roots.push(root);
  const origin = join(root, 'origin.git'), seed = join(root, 'seed'), clone = join(root, 'clone');
  git(root, 'init', '-q', '--bare', '-b', 'main', origin);
  git(root, 'clone', '-q', origin, seed);
  mkdirSync(join(seed, 'data/observations'), { recursive: true });
  writeFileSync(join(seed, 'data/observations/.keep'), '');
  git(seed, 'add', '.'); git(seed, 'commit', '-q', '-m', 'init'); git(seed, 'push', '-q', 'origin', 'HEAD:main');
  git(root, 'clone', '-q', origin, clone);

  const log = join(root, 'calls.log');
  const npx = join(root, 'npx'), gh = join(root, 'gh');
  // npx giả: lần nào cũng hỏng như khi Open-Meteo trả 429.
  writeFileSync(npx, `#!/bin/bash\necho "npx $*" >> ${log}\necho "❌ HTTP 429 từ api.open-meteo.com" >&2\nexit 1\n`);
  // gh giả: "run list" trả số lượt đang chạy; "workflow run" ghi lại, và (nếu ghCommits) đóng vai Actions đẩy tệp lên origin.
  const actions = o.ghCommits
    ? `cd ${seed} && git pull -q origin main && echo '{}' > data/observations/${D}-forecast.json && git add . && git commit -q -m bot && git push -q origin HEAD:main`
    : 'true';
  writeFileSync(gh, `#!/bin/bash\necho "gh $*" >> ${log}\nif [ "$1" = run ]; then echo ${o.ghBusy ?? 0}; exit 0; fi\nif [ "$1" = workflow ]; then ( ${actions} ) >/dev/null 2>&1; exit 0; fi\nexit 1\n`);
  chmodSync(npx, 0o755); chmodSync(gh, 0o755);

  const r = spawnSync('bash', [SCRIPT, D], {
    encoding: 'utf8', timeout: 60_000,
    env: cleanEnv({
      CH_SNAP_DIR: clone, CH_NPX: npx, CH_GH: gh, CH_PROBE: o.probe,
      CH_RETRY_WAITS: o.waits ?? '0 0 0', CH_POLL_SEC: '1', CH_DISPATCH_WAIT: '3',
    }),
  });
  const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
  return { code: r.status, out: r.stdout + r.stderr, calls, onOrigin: git(root, '--git-dir', origin, 'ls-tree', '-r', '--name-only', 'main').includes(`${D}-forecast.json`) };
}

const DAILY = `echo '{"reason":"Daily API request limit exceeded. Please try again tomorrow.","error":true}'`;
const MINUTE = `echo '{"reason":"Minutely API request limit exceeded. Please try again in one minute.","error":true}'`;

describe('snapshot-local.sh: 429 theo ngày -> Actions', () => {
  it('429 NGÀY: chụp 1 lần, kích verify-loop job=snapshot đúng ngày, chờ tệp lên origin rồi thoát 0', () => {
    const r = run({ probe: DAILY, ghCommits: true });
    expect(r.out).toContain('hết hạn mức NGÀY');
    expect(r.calls.filter(c => c.startsWith('npx') && c.includes('snapshot-forecast'))).toHaveLength(1);
    expect(r.calls).toContain(`gh workflow run verify-loop.yml -f job=snapshot -f date=${D}`);
    expect(r.onOrigin).toBe(true);
    expect(r.code).toBe(0);
  });

  it('429 NGÀY mà Actions không ra tệp trong giờ chờ: thoát ĐỎ', () => {
    const r = run({ probe: DAILY, ghCommits: false });
    expect(r.calls.some(c => c.startsWith('gh workflow run'))).toBe(true);
    expect(r.out).toContain('chưa có');
    expect(r.code).toBe(1);
  });

  it('đã có lượt verify-loop đang chạy: không kích trùng, chỉ chờ', () => {
    const r = run({ probe: DAILY, ghBusy: 1 });
    expect(r.calls.some(c => c.startsWith('gh workflow run'))).toBe(false);
    expect(r.code).toBe(1);
  });

  it('429 theo PHÚT (không phải ngày): giữ đường thử lại cũ, KHÔNG gọi Actions, hết lượt thì đỏ', () => {
    const r = run({ probe: MINUTE, waits: '0 0 0' });
    expect(r.calls.filter(c => c.includes('snapshot-forecast'))).toHaveLength(3);
    expect(r.calls.some(c => c.startsWith('gh'))).toBe(false);
    expect(r.code).toBe(1);
  });
});
