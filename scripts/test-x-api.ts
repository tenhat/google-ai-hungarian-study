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
    // First, test simple text
    const testText = `API connection test: ${new Date().toISOString()}`;
    const response1 = await client.v2.tweet(testText);
    console.log('✅ Write Access OK (Plain Text)! Tweet ID:', response1.data.id);
    
    // Clean up
    await client.v2.deleteTweet(response1.data.id);
    
    // Next, test URL
    console.log('\nTesting Write Access with URL...');
    const urlText = `API URL test: https://hungarian-study-tenju.web.app/ ${new Date().toISOString()}`;
    const response2 = await client.v2.tweet(urlText);
    console.log('✅ Write Access OK (With URL)! Tweet ID:', response2.data.id);
    
    // Clean up
    await client.v2.deleteTweet(response2.data.id);

  } catch (error: any) {
    console.error('❌ Write Access Failed:', error?.data || error);
  }
}

testXApi();
