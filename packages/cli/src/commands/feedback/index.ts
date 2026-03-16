import { createInterface } from 'readline';
import { readConfig, writeConfig } from '../../lib/config-file.js';
import { publicFetch } from '../../core/http.js';
import { createCLILogger } from '../../core/cli-logger.js';

// === Programmatic API ===

export interface FeedbackOptions {
  anonymous?: boolean;
}

export async function feedback(
  text: string,
  options?: FeedbackOptions,
): Promise<void> {
  const config = readConfig();

  const anonymous = options?.anonymous ?? config?.anonymousFeedback ?? true;

  const payload: {
    text: string;
    userId?: string;
    projectId?: string;
  } = { text };

  if (!anonymous && config?.email) {
    payload.userId = config.email;
    const projectId = process.env.WALKEROS_PROJECT_ID;
    if (projectId) {
      payload.projectId = projectId;
    }
  }

  const response = await publicFetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Feedback submission failed: ${response.status} ${response.statusText}`,
    );
  }
}

// === CLI Command Handler ===

export async function feedbackCommand(text: string): Promise<void> {
  const logger = createCLILogger({});
  try {
    const config = readConfig();
    let anonymous: boolean;

    if (config?.anonymousFeedback === undefined) {
      // First time: prompt user for consent
      const answer = await promptUser(
        'Include your user and project info with feedback? (y/N) ',
      );
      const anonymousFeedback = !answer.toLowerCase().startsWith('y');

      // Persist the choice
      if (config) {
        writeConfig({ ...config, anonymousFeedback });
      } else {
        writeConfig({
          token: '',
          email: '',
          appUrl: '',
          anonymousFeedback,
        });
      }
      anonymous = anonymousFeedback;
    } else {
      anonymous = config.anonymousFeedback;
    }

    await feedback(text, { anonymous });
    logger.info('Feedback sent. Thanks!');
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function promptUser(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
