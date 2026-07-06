/**
 * Run the AI vetting pass from the command line.
 *   pnpm --filter @attiko/api exec tsx --env-file .env src/scripts/classify.ts [--max N]
 * Without --max it classifies every unclassified artist.
 */
import { runClassification } from "../services/classify.js";

const maxArg = process.argv.indexOf("--max");
const max = maxArg !== -1 ? parseInt(process.argv[maxArg + 1] ?? "", 10) : undefined;

const result = await runClassification(Number.isNaN(max) ? undefined : max);
console.log(JSON.stringify(result, null, 2));
process.exit(result.errors.length > 3 ? 1 : 0);
