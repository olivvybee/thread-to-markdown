import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

import { ThreadTweet } from './types';

const LOOKUP_URL =
  'https://api.twitter.com/1.1/statuses/show/{{id}}?tweet_mode=extended&include_ext_alt_text=true';

const URL_REGEX = /(twitter\.com\/\w+\/status\/)(\d+)/;

const makeRequest = async (url: string, token: string) =>
  axios.get(url, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

export const fetchThreads = async (
  urls: string[],
  token: string
): Promise<ThreadTweet[] | undefined> => {
  console.log('Loading tweets...');

  const threadTweets: ThreadTweet[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    let count = 0;

    const spinner = ora();
    if (urls.length > 1) {
      spinner.prefixText = `Thread ${i + 1} of ${urls.length}`;
    }
    spinner.start();

    const regexMatch = url.match(URL_REGEX);

    if (!regexMatch) {
      spinner.fail(`This doesn't look like a tweet url: "${url}"`);
      return undefined;
    }

    let tweetId = regexMatch[2];

    while (tweetId) {
      const url = LOOKUP_URL.replace('{{id}}', tweetId);
      const response = await makeRequest(url, token).catch((err) => {
        if (err.response.status === 404) {
          if (threadTweets.length > 0) {
            spinner.warn();
            console.log(
              chalk.yellow(`Thread contains a deleted tweet (${tweetId}).`)
            );
            const lastGoodTweet = threadTweets[threadTweets.length - 1].id;
            const lastGoodTweetUrl = `https://${regexMatch[1]}${lastGoodTweet}`;
            console.log(
              chalk.yellow(
                `If the thread contains earlier tweets, run this script again using the next non-deleted tweet starting from ${lastGoodTweetUrl}.`
              )
            );
          } else {
            throw new Error('Cannot find requested tweet');
          }
        }
      });

      if (!response) {
        break;
      }

      const {
        id_str: id,
        full_text,
        extended_entities,
        in_reply_to_status_id_str,
        created_at,
      } = response.data;

      const images =
        extended_entities?.media
          ?.filter((entity) => entity.type === 'photo')
          .map((entity) => {
            const { media_url_https: url, ext_alt_text: altText } = entity;
            const filename = url.slice(url.lastIndexOf('/') + 1);

            return {
              url,
              filename,
              altText,
            };
          }) || [];

      const videos =
        extended_entities?.media
          ?.filter((entity) => entity.type === 'video')
          .map((entity) =>
            entity.video_info.variants.reduce(
              (bestVariant, variant) => {
                return variant.bitrate > bestVariant.bitrate
                  ? variant
                  : bestVariant;
              },
              { bitrate: 0, url: '' }
            )
          )
          .map((variant) => variant.url) || [];

      const urlPositions = [
        ...new Set<[number, number]>(
          extended_entities?.media?.map((entity) => entity.indices)
        ),
      ];
      const text = urlPositions
        .reduce(
          (output, positions) =>
            output.slice(0, positions[0]) + output.slice(positions[1] + 1),
          full_text as string
        )
        .trim();

      threadTweets.push({
        id,
        previousId: in_reply_to_status_id_str,
        text,
        timestamp: new Date(created_at).getTime(),
        images,
        videos,
      });
      count += 1;

      tweetId = in_reply_to_status_id_str;

      spinner.text = `${count} found`;
    }

    if (spinner.isSpinning) {
      spinner.succeed();
    }
  }

  threadTweets.sort((a, b) => a.timestamp - b.timestamp);
  return threadTweets;
};
