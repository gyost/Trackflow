import { seedSupabase } from './src/services/seedService';

async function run() {
  console.log('Running seedSupabase...');
  try {
    const result = await seedSupabase();
    console.log('seedSupabase result:', result);
  } catch (err) {
    console.error('seedSupabase threw error:', err);
  }
}

run();
