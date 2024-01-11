import express from 'express';
import bodyParser from 'body-parser';
import { exec, execSync, spawnSync } from 'child_process';

import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import { dirname } from 'path';
import fs from 'fs';
import 'dotenv/config';

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
const resourceDir = path.join(homeDir, 'leetcode-server', 'public');

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
    // console.log(req.body);
    const { difficulty, formattedTitle, fileText } = req.body;
    const filePath = path.join(
        homeDir,
        'leetcode',
        difficulty,
        `${formattedTitle}.py`
    );
    try {
        fs.writeFileSync(filePath, fileText);
        console.log('File written successfully.');
        const options = {
            cwd: path.join(homeDir, 'leetcode'),
            encoding: 'UTF-8',
        };
        execSync('git add .', options);
        console.log('added files');
        const commitMessage = `[jasbob-leetcode-bot] automated upload of <${difficulty}> ${formattedTitle}`;
        execSync(`git commit -m '${commitMessage}'`, options);
        console.log('committed files');
        const execOutput = spawnSync('git', ['push'], {
            ...options,
            maxBuffer: 1024 * 1024 * 100,
        });
        const output = execOutput.output.join(' ');
        console.log('pushed files');
        console.log(`output from git push: %${output}%`);
        const commit = extractLatestCommit(output);
        console.log('commit', commit);
        const url_ending = commit ? `commit/${commit}` : '';
        const data = {
            embeds: [
                {
                    fields: [
                        {
                            name: `[jasbob-leetcode-bot] Automated Upload Triggered!`,
                            value: `Uploaded <${difficulty}> ${formattedTitle} [(here)](https://github.com/jason-tung/leetcode/${url_ending})`,
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
        console.log('omg we uploaded!?!');
        res.status(200).send(`${formattedTitle}`);
    } catch (err) {
        console.error('Error writing file:', err);
        res.status(500).send('Error executing command');
    }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
