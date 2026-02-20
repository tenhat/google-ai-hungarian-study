import { TwitterApi } from 'twitter-api-v2';
import * as dotenv from 'dotenv';

dotenv.config();

async function testXApi() {
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    console.error('Missing API credentials in .env');
    return;
  }

  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  try {
    console.log('Testing Read Access (v2/users/me)...');
    const me = await client.v2.me();
    console.log('✅ Read Access OK! Authenticated as:', me.data.username);
  } catch (error: any) {
    console.error('❌ Read Access Failed:', error?.data || error);
  }

  try {
    console.log('\nTesting Write Access (Creating a draft/dummy tweet)...');
    // Just a basic text without URLs or hashtags to avoid spam filters
    const testText = `API connection test: ${new Date().toISOString()}`;
    const response = await client.v2.tweet(testText);
    console.log('✅ Write Access OK! Tweet ID:', response.data.id);
    
    // Clean up
    console.log('Deleting test tweet...');
    await client.v2.deleteTweet(response.data.id);
    console.log('✅ Test tweet deleted.');
  } catch (error: any) {
    console.error('❌ Write Access Failed:', error?.data || error);
  }
}

testXApi();
