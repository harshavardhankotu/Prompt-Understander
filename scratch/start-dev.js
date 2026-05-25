import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load root .env variables
const rootEnvPath = path.resolve(__dirname, "../.env");
const envVars = { ...process.env };

if (fs.existsSync(rootEnvPath)) {
  console.log(`Loading environment variables from: ${rootEnvPath}`);
  const envContent = fs.readFileSync(rootEnvPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
      envVars[key.trim()] = value;
    }
  });
}

// Ensure default development variables are populated
envVars.NODE_ENV = 'development';
envVars.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass self-signed cert checks inside Express backend
envVars.PORT = '3001'; // Backend port
envVars.DATABASE_URL = envVars.DATABASE_URL || "postgresql://postgres.mrjmsmhhzkinvmljxqsk:RYPX99p9MtV0u349@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require";

// 2. Build the server first (since server/package.json's dev script uses bash export and build)
console.log("Building server workspace...");
const buildProc = spawn('npx', ['pnpm', '--filter', '@omnibid/server', 'run', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: envVars
});

buildProc.on('close', (code) => {
  if (code !== 0) {
    console.error("Server build failed!");
    process.exit(code);
  }

  console.log("\nServer build successful. Starting dev servers concurrently...\n");

  // Spawn backend server
  const serverProc = spawn('npx', ['pnpm', '--filter', '@omnibid/server', 'run', 'start'], {
    stdio: 'inherit',
    shell: true,
    env: { ...envVars, PORT: '3001' }
  });

  // Spawn client server with PORT=3000 and BASE_PATH=/
  const clientProc = spawn('npx', ['pnpm', '--filter', '@omnibid/client', 'run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...envVars, PORT: '3000', BASE_PATH: '/' }
  });

  process.on('SIGINT', () => {
    serverProc.kill();
    clientProc.kill();
    process.exit(0);
  });
});
