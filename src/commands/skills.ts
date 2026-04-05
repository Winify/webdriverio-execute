import type { ArgumentsCamelCase, Argv } from 'yargs';

import { listTopics, getTopicGuide, getTopicFlags, isKnownTopic } from '../skills.js';

export const command = 'skills [topic]';
export const desc = 'Show agent skill documentation for wdiox commands';

export const builder = (yargs: Argv) => {
  return yargs
    .positional('topic', {
      type: 'string',
      describe: 'Topic to show (run without argument to list all topics)',
    })
    .option('flags', {
      type: 'boolean',
      describe: 'Show flags table only (requires a topic)',
    });
};

interface SkillsArgs {
  topic?: string
  flags?: boolean
}

export const handler = async (argv: ArgumentsCamelCase<SkillsArgs>): Promise<void> => {
  const topic = argv.topic;
  const flags = argv.flags;

  // No topic: list all topics
  if (!topic) {
    const topics = listTopics();
    const lines = ['Available topics (run: wdiox skills <topic>):', ''];
    for (const t of topics) {
      lines.push(`  ${t.name.padEnd(20)} ${t.description}`);
    }
    console.log(lines.join('\n'));
    return;
  }

  // Validate topic for all modes
  if (!isKnownTopic(topic)) {
    console.error(`Unknown topic: "${topic}". Run 'wdiox skills' to list available topics.`);
    process.exit(1);
  }

  // Topic + --flags: show flags table only
  if (flags) {
    const flagsTable = getTopicFlags(topic);
    if (flagsTable) {
      console.log(flagsTable);
    } else {
      console.log(`Topic "${topic}" has no flags.`);
    }
    return;
  }

  // Topic only: show full guide
  const guide = await getTopicGuide(topic);
  console.log(guide!);
};
