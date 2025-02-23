import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Function to read file content with error handling
function readFileContent(filePath) {
    try {
        if (!existsSync(filePath)) {
            return `File not found: ${filePath}`;
        }
        return readFileSync(filePath, 'utf8');
    } catch (error) {
        return `Error reading ${filePath}: ${error.message}`;
    }
}

// Define all required files
const requiredFiles = [
    'src/static/index.html',
    'src/auth.ts',
    'src/dspy_mock.ts',
    'src/event_suggester.ts',
    'src/main.ts',
    'src/scheduler.ts',
    'src/serendipity_agent.test.ts',
    'src/serendipity_agent.ts',
    'src/user_profile.ts',
    'deno.json',
    'run-serendipity.sh',
    'user_profiles.json'
];

let allContent = [];

// Process each required file
for (const file of requiredFiles) {
    allContent.push(`\n=== ${file} ===\n`);
    allContent.push(readFileContent(file));
}

// Write everything to output file
writeFileSync('combined_files.txt', allContent.join('\n'));
console.log('Files have been combined into combined_files.txt');
