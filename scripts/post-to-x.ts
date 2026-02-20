import { TwitterApi } from 'twitter-api-v2';
import * as dotenv from 'dotenv';

// Load environment variables from .env file (useful for local testing)
dotenv.config();

// Define promotional post patterns
const promotionPatterns = [
  // Pattern 1: Focus on AI Chat
  "Sziasztok! 🇭🇺\nWant to master Hungarian practically?\n\n'Hungarian Study Tenju' features an AI language tutor! Practice real-life conversations, get instant grammar corrections, and build your vocabulary directly from the context.\n\nTry it now for free! 👇\nhttps://hungarian-study-tenju.web.app/ \n#Hungarian #LanguageLearning #AI",

  // Pattern 2: Focus on Smart Translate
  "Jó napot! 🇭🇺\nStruggling with Hungarian grammar?\n\nOur app's 'Smart Translate' goes beyond simple translations. It provides deep grammar insights and example sentences to help you truly understand how Hungarian works.\n\nLevel up your learning today! 👇\nhttps://hungarian-study-tenju.web.app/ \n#LearnHungarian #Magyar #LanguageLearning",

  // Pattern 3: Focus on SM-2 Repetition Quiz
  "Szia! 🇭🇺\nTired of forgetting what you learned?\n\n'Hungarian Study Tenju' uses an SM-2 spaced-repetition algorithm for quizzes. Review the words YOU collected exactly when you need to, making them stick for good!\n\nStart building your vocabulary! 👇\nhttps://hungarian-study-tenju.web.app/ \n#HungarianLanguage #StudyTips",

  // Pattern 4: General Appeal
  "Hungarian is known to be challenging, but it doesn't have to be frustrating! 🇭🇺✨\n\n'Hungarian Study Tenju' is designed to make your learning journey efficient and engaging with AI chats, grammar breakdowns, and optimized quizzes.\n\nCheck it out! 👇\nhttps://hungarian-study-tenju.web.app/ \n#LanguageApp #Hungarian",
];

async function postToX() {
  console.log('--- Starting X Promotional Post Script ---');

  // 1. Validate Environment Variables
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    console.error('ERROR: Missing required Twitter API environment variables.');
    console.error('Please ensure TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET are set.');
    process.exit(1);
  }

  // 2. Initialize Twitter Client
  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  // 3. Select a pattern based on the current day (Day of the year)
  // This ensures a predictable rotation of the promotional messages.
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const selectedPatternIndex = dayOfYear % promotionPatterns.length;
  const postContent = promotionPatterns[selectedPatternIndex];

  console.log(`Day of Year: ${dayOfYear}`);
  console.log(`Selected Pattern Index: ${selectedPatternIndex}`);
  console.log('--- Post Content Pending ---');
  console.log(postContent);
  console.log('----------------------------');

  // 4. Send the Tweet
  try {
    // Determine if executing a dry run based on an environment variable
    if (process.env.DRY_RUN === 'true') {
      console.log('DRY_RUN is enabled. Skipping actual post to X.');
    } else {
      console.log('Sending post to X...');
      const response = await client.v2.tweet(postContent);
      console.log('Successfully posted to X!');
      console.log(`Tweet ID: ${response.data.id}`);
    }
  } catch (error) {
    console.error('Failed to post to X:', error);
    process.exit(1);
  }

  console.log('--- Script Finished ---');
}

// Execute the main function
postToX();
