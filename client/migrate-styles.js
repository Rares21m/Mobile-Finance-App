const fs = require('fs');
const path = require('path');

const replacements = {
    // Backgrounds
    "bg-dark-bg": "bg-background",
    "bg-dark-surface": "bg-surface",
    "bg-dark-card": "bg-card",
    // Borders
    "border-dark-border": "border-border",
    // Text
    "text-white": "text-foreground",
    "text-white/70": "text-text-muted",
    "text-white/60": "text-text-muted",
    "text-white/50": "text-text-muted",
    "text-gray-400": "text-text-muted",
    "text-gray-300": "text-text-muted",
};

// Exceptional cases for replacing text-text-muted to text-muted to match tailwind color
const exactReplacements = {
    "text-text-muted": "text-muted"
};

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            for (const [oldClass, newClass] of Object.entries(replacements)) {
                // Regex pentru a asigura ca respectam limitele cuvintelor CSS din clasele tailwind
                const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
                if (regex.test(content)) {
                    content = content.replace(regex, newClass);
                    changed = true;
                }
            }

            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

const targetDirs = [
    path.join(__dirname, 'app'),
    path.join(__dirname, 'components')
];

for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
        processDirectory(dir);
    }
}

console.log('Migration complete.');
