const { execSync } = require('child_process');
const fs = require('fs');

async function runBuild() {
  try {
    console.log('1. Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });

    console.log('\n2. Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    console.log('\n3. Applying database changes...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    } catch (error) {
      console.log('\nMigration failed, trying db push...');
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    }

    console.log('\n4. Building Next.js application...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('\n✅ Build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

runBuild();
