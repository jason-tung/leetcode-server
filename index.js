import express from 'express';
import bodyParser from 'body-parser';
import { execSync, spawnSync } from 'child_process';

import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';

import { getFirestore } from 'firebase-admin/firestore';

import serviceAccount from './firebase-key.json' assert { type: 'json' };

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

const log = (...args) => {
    if (process.env.PRINTDEV == 'true') console.log(...args);
};

const getCurrentTime = () => {
    const currentDate = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    );

    const year = currentDate.getFullYear().toString().padStart(4, '0');
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');

    return `${month}/${day}/${year} ${hours}:${minutes}`;
};

const extractLatestCommit = (s) => {
    return s.match(/(?<=[ \t]+[a-z0-9]+\.\.)[a-z0-9]+/)?.[0];
};

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const homeDir = os.homedir();
const resourceDir = process.env.RESOURCEDIR
    ? path.join(homeDir, process.env.RESOURCEDIR)
    : path.join(homeDir, 'leetcode-server', 'public');

app.use('/public', express.static('public')); // works

const authenticate = (req, res, next) => {
    const { apiKey } = req.body;
    const expectedKey = process.env.PASSWORD;
    if (apiKey === expectedKey) {
        next();
    } else {
        console.log('unauth request', req.body);
        return res.status(401).send('Unauthorized');
    }
};

const getRandomImage = (key) => {
    const files = fs.readdirSync(resourceDir);
    key = key && key < 1 ? key : Math.random();
    const randomIndex = Math.floor(key * files.length);
    return files[randomIndex];
};
app.get('/randomimage', (req, res) => {
    const randomImage = getRandomImage(req.query.key);
    const imagePath = path.join(resourceDir, randomImage);

    res.sendFile(imagePath);
});

app.get('/', (req, res) => res.send('hi'));

// body should look like:
// body: JSON.stringify({
//     difficulty,
//     formattedTitle,
//     fileText,
//     apiKey: password,
// }),
app.post('/updateGithub', authenticate, (req, res) => {
    const { difficulty, formattedTitle, suffix, fileText, url } = req.body;
    const titleWithSuffix =
        suffix.length > 0 ? `${formattedTitle}-${suffix}` : formattedTitle;
    // check the title looks right
    if (/[^a-zA-Z0-9\-]/.test(titleWithSuffix)) {
        res.status(501).send('Bad title');
        return;
    }
    let basePath = homeDir;
    if (process.env.WORKDIR) {
        basePath = path.join(homeDir, process.env.WORKDIR);
    } else {
        basePath = path.join(homeDir, 'leetcode');
    }
    let filePath = path.join(basePath, difficulty, `${titleWithSuffix}.py`);
    try {
        const fileExists = fs.existsSync(filePath);
        fs.writeFileSync(filePath, fileText);
        log('File written successfully.');
        const options = {
            cwd: basePath,
            encoding: 'UTF-8',
        };
        spawnSync('git', ['pull'], {
            ...options,
            maxBuffer: 1024 * 1024 * 100,
        });
        log('execute pull');
        execSync('git add .', options);
        log('added files');
        const commitMessage = `[jasbob-leetcode-bot] automated upload of <${difficulty}> ${titleWithSuffix}`;
        execSync(`git commit -m '${commitMessage}'`, options);
        log('committed files');
        const execOutput = spawnSync('git', ['push'], {
            ...options,
            maxBuffer: 1024 * 1024 * 100,
        });
        const output = execOutput.output.join(' ');
        log('pushed files');
        log(`output from git push: %${output}%`);
        const commit = extractLatestCommit(output);
        log('commit', commit);
        const url_ending = commit ? `commit/${commit}` : '';
        const docRef = db.collection('leetcode_actions').doc();
        const splitName = formattedTitle.split('-');
        const problemNumber = splitName[0];
        const problemName = splitName
            .slice(1)
            .join(' ')
            .replace(/^\w|\s\w/g, (x) => x.toUpperCase());
        (async () => {
            if (!formattedTitle.startsWith('99999')) {
                await docRef.set({
                    formattedTitle,
                    problemNumber,
                    problemName,
                    suffix,
                    url,
                    difficulty,
                    action: suffix.length > 0 ? 'write_alt_sol' : 'write_sol',
                    rewrite: fileExists,
                    timestamp: new Date(),
                });
            } else {
                console.log('test case... skipping upload');
            }

            const collectionRef = db.collection('leetcode_actions');
            const snapshot = await collectionRef.count().get();
            const cnt = snapshot.data().count;
            const uniqueValuesSet = new Set();
            const collectionSnapshot = await collectionRef.get();
            collectionSnapshot.forEach((doc) => {
                // Access the field value and add it to the Set
                const fieldValue = doc.data()['problemNumber'];
                if (fieldValue == undefined) {
                    console.log(doc.id);
                }
                if (fieldValue != '99999') {
                    uniqueValuesSet.add(fieldValue);
                }
            });
            const data = {
                embeds: [
                    {
                        color: '2484902',
                        fields: [
                            {
                                name: `[jasbob-leetcode-bot] Automated Upload Triggered!`,
                                value: `Uploaded <${difficulty}> ${titleWithSuffix} [(here)](https://github.com/jason-tung/leetcode/${url_ending})

                                Total entries stored: ${cnt}
                                Unique problems solved: ${uniqueValuesSet.size}
                                `,
                            },
                        ],
                        thumbnail: {
                            url: `http://jasontung.me:3001/randomimage?key=${Math.random()}`,
                        },
                        footer: {
                            text: `powered by jasbob-bot ・ ${getCurrentTime()}`,
                            icon_url:
                                'https://avatars.githubusercontent.com/u/153464167?v=4',
                        },
                    },
                ],
            };
            fetch(process.env.WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            console.log('finished upload', titleWithSuffix, commit);
            res.status(200).send(
                `https://github.com/jason-tung/leetcode/${url_ending}`
            );
        })();
    } catch (err) {
        console.error('Error writing file:', err);

        res.status(500).send('Error executing command');
    }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
