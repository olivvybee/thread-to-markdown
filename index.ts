import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { config as loadEnv } from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';

import { fetchThreads } from './fetch-threads.js';
import { generateMarkdown } from './generate-markdown.js';
import { downloadImages } from './download-images.js';

const main = async () => {
  loadEnv();

  const argv = yargs(hideBin(process.argv))
    .command('* <urls..>', 'Do the thing')
    .positional('urls', {
      description: 'URLs of the last tweet from each thread to convert',
      demandOption: true,
      type: 'string',
      array: true,
    })
    .options({
      imageDir: {
        alias: 'i',
        description: 'Directory to store downloaded images',
        default: './images',
        type: 'string',
      },
      imagePath: {
        alias: 'I',
        description: 'Path to use in URLs for images in the output',
        default: './images',
        type: 'string',
      },
      outfile: {
        alias: 'o',
        description: 'Path to the generated markdown file',
        default: './thread.md',
        type: 'string',
      },
      periods: {
        alias: 'p',
        description: 'Ensure all tweets end with a period in the output',
        type: 'boolean',
      },
      token: {
        alias: 't',
        description: 'Twitter bearer token',
        default: process.env.TWITTER_BEARER_TOKEN,
        defaultDescription: 'TWITTER_BEARER_TOKEN environment variable',
        demandOption: true,
        type: 'string',
      },
    })
    .parseSync();

  const tweets = await fetchThreads(argv.urls, argv.token);
  if (!tweets || !tweets.length) {
    process.exit(1);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  await downloadImages(tweets, path.resolve(__dirname, argv.imageDir));

  const markdown = generateMarkdown(tweets, {
    ensurePeriods: argv.periods,
    imagePath: argv.imagePath,
  });

  const outfile = path.resolve(__dirname, argv.outfile);
  fs.writeFileSync(outfile, markdown, 'utf-8');

  console.log(chalk.green(`Markdown file has been saved to ${outfile}!`));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
