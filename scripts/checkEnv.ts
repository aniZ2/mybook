// scripts/checkEnv.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('🔍 Checking environment variables:\n');
console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? '✅ Found' : '❌ Missing');
console.log('FIREBASE_AUTH_DOMAIN:', process.env.FIREBASE_AUTH_DOMAIN ? '✅ Found' : '❌ Missing');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Found' : '❌ Missing');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Found' : '❌ Missing');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Found' : '❌ Missing');
console.log('NEXT_PUBLIC_ALGOLIA_APP_ID:', process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ? '✅ Found' : '❌ Missing');
console.log('ALGOLIA_ADMIN_KEY:', process.env.ALGOLIA_ADMIN_KEY ? '✅ Found' : '❌ Missing');

console.log('\n📝 All env keys starting with FIREBASE or NEXT_PUBLIC_FIREBASE:');
Object.keys(process.env)
  .filter(key => key.includes('FIREBASE'))
  .forEach(key => console.log(`  - ${key}`));