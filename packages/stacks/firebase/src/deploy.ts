import * as admin from 'firebase-admin';
import { exec } from 'child_process';

export async function deploy(path: string) {
  // Dynamically import the user's configuration
  const stack = (await import(path)).default;

  // Initialize Firebase with the user's token or other configurations
  const app = admin.initializeApp(stack.firebase);

  // // Run the setup method if it exists in the user's configuration
  // if (typeof userConfig.setup === 'function') {
  //     await userConfig.setup();
  // }

  // Deploy using Firebase CLI
  exec(
    'firebase deploy --only functions',
    (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Exec error: ${error.message}`);
        return;
      }

      if (stderr) {
        console.error(`Errors: ${stderr}`);
      }

      console.log(`Output: ${stdout}`);
    },
  );
}

// @TODO separate the files for immediate execution and for testing
// Execute the deploy function
// deploy(process.argv[2]).catch((error) => {
//   console.error(`Deployment failed: ${error.message}`);
// });
