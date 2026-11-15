#!/usr/bin/env node
// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * build-references.mjs — writes shared/references.md from shared/design/sources.json, so the in-game
 * Science Log, the README and the submission's References field always list the same things.
 * Usage (repo root): node shared/scripts/build-references.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { sources, retrieved } = JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'sources.json'), 'utf8'));
const GROUPS = [
  ['data', 'NASA data that drives game mechanics'],
  ['partner', 'Space agency partner data and resources'],
  ['fact', 'NASA facts checked for in-game text'],
  ['asset', '3D models, textures, code libraries and fonts'],
  ['tool', 'Tools used to build the project (not shipped in the game)'],
  ['si', 'SI (AI) tools'],
];
let md = '# References — every dataset, model, texture, library, font, tool and SI tool used\n\n';
md += '> Generated from `shared/design/sources.json` by `shared/scripts/build-references.mjs`. Edit the JSON, not this file.\n';
md += `> Links checked ${retrieved}. NASA material is used under the NASA Images and Media Usage Guidelines: credit given, no endorsement implied, no NASA insignia shown.\n\n`;
for (const [kind, title] of GROUPS) {
  const list = sources.filter((s) => s.kind === kind);
  if (!list.length) continue;
  md += `## ${title}\n\n| Source | What we used it for |\n|---|---|\n`;
  for (const s of list) md += `| **${s.org}** — [${s.title}](${s.url})${s.license ? ` · ${s.license}` : ''} | ${s.use}${s.note ? ` *${s.note}*` : ''} |\n`;
  md += '\n';
}
md += '## Original work\n\nGame concept, story, characters, interface, simulation rules and all in-game text are original to Team PlutonyX (text and code drafted with SI assistance and reviewed by the team). All sound effects and music are generated in code at run time. No copyrighted music, images or characters are used.\n';
fs.writeFileSync(path.join(ROOT, 'references.md'), md);
console.log('references.md written:', sources.length, 'sources');
