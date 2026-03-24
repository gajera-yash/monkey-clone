const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
// You need to set SUPABASE_DB_URL in your server/.env
// Format: postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
const dbUrl = process.env.SUPABASE_DB_URL;
const backupDir = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

if (!dbUrl) {
    console.error('❌ Error: SUPABASE_DB_URL is not defined in .env');
    console.log('Please add: SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres');
    process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const fileName = `backup-${timestamp}.sql`;
const filePath = path.join(backupDir, fileName);

console.log(`🚀 Starting database backup...`);
console.log(`Target: ${filePath}`);

// Command to run pg_dump
// Note: pg_dump must be installed on the system where this script runs
const command = `pg_dump "${dbUrl}" > "${filePath}"`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Backup failed: ${error.message}`);
        return;
    }
    if (stderr && !stderr.includes('notices')) {
        console.warn(`⚠️ Warning: ${stderr}`);
    }

    console.log(`✅ Backup completed successfully: ${fileName}`);
    
    // Retention policy: Keep only the last 7 backups
    fs.readdir(backupDir, (err, files) => {
        if (err) return;
        
        const backupFiles = files
            .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (backupFiles.length > 7) {
            backupFiles.slice(7).forEach(f => {
                fs.unlinkSync(path.join(backupDir, f.name));
                console.log(`🗑️ Deleted old backup: ${f.name}`);
            });
        }
    });
});
