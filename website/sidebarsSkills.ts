import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Skills index is the single source of truth (also drives the generator).
// Building the sidebar from it keeps category grouping in sync with the
// emitted pages, so adding a skill needs no sidebar edit.
interface SkillEntry {
  name: string;
  category: string;
}
const index = require('../skills/INDEX.json') as { skills: SkillEntry[] };

const CATEGORY_ORDER = ['understanding', 'using', 'create', 'task'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  understanding: 'Understanding',
  using: 'Using',
  create: 'Creating',
  task: 'Tasks',
};

const categories = CATEGORY_ORDER.map((category) => {
  const items = index.skills
    .filter((skill) => skill.category === category)
    .map((skill) => skill.name);
  return { category, items };
}).filter((group) => group.items.length > 0);

const sidebars: SidebarsConfig = {
  skillsSidebar: [
    'index',
    ...categories.map((group) => ({
      type: 'category' as const,
      label: CATEGORY_LABELS[group.category] || group.category,
      collapsed: false,
      items: group.items,
    })),
  ],
};

export default sidebars;
