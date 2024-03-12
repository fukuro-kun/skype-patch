const fs = require('fs');
const exec = require('child_process').exec;
const loadJson = require('load-json-file');
const updatesFile = './updates.json';

/**
 * Validation.
 */

if (process.argv.length < 3) {
    console.log('Sie müssen den Installationsort von Skype angeben. Es muss der Ordner sein, in dem sich app.asar befindet.');
    console.log('z.B.:   node patch.js /usr/share/skypeforlinux/resources');
    process.exit(0);
}

const skypeDir = process.argv[2];

if (! fs.existsSync(skypeDir)) {
    console.log('Das Verzeichnis existiert nicht.');
    process.exit(0);
}

if (! fs.existsSync(path('app.asar'))) {
    console.log('Das Verzeichnis enthält die Datei "app.asar" nicht.');
    process.exit(0);
}

// Create a backup of the app.asar file if one doesn't already exist.
if (! fs.existsSync(path('app.asar.bak'))) {
    console.log('Erstelle ein Backup der app.asar, weil noch keines da ist.');
    fs.createReadStream(path('app.asar')).pipe(fs.createWriteStream(path('app.asar.bak')));
}

// Extract the asar file.
exec(`npx asar extract ${path('app.asar')} ${path('app')}`, () => {
    // Parse the updates file.
    loadJson(updatesFile).then(updates => {
        for (let file in updates) {
            let filePath = path(`app/${file}`);
            let update = updates[file];
            let contents = fs.readFileSync(filePath, 'utf8');

            console.log(`Processing ${file}...`);

            if (update.replace) {
                for (let regex in update.replace) {
                    let flags, substitute = update.replace[regex];

                    // Build a valid RegExp string.
                    regex = regex.substr(1);
                    regex = regex.split('/');
                    flags = regex.pop();
                    regex = regex.join('');
                    regex = regex.replace(/^#/, '\\#');
                    regex = new RegExp(regex, flags);

                    if (regex.test(contents)) {
                        contents = contents.replace(regex, substitute);
                        
                        console.log(`\x1b[33m${regex}\x1b[0m -- \x1b[32mErfolg\x1b[0m`);
                    } else {
                        console.log(`\x1b[33m${regex}\x1b[0m -- \x1b[31mFehlgeschlagen\x1b[0m`);
                    }
                }
            }

            if (update.appendFile) {
                let newContents = fs.readFileSync(`stubs/${update.appendFile}`, 'utf8');

                contents += newContents;
            }

            fs.writeFileSync(filePath, contents);
        }

        console.log('Entferne das .asar Archiv, weil es nicht mehr gebraucht wird.');
        fs.unlinkSync(path('app.asar'));
    });
});

function path(to) {
    return skypeDir.replace(/\/+$/, '') + '/' + to.replace(/^\/+/, '');
}
