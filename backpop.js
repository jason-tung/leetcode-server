import fetch from 'node-fetch';
import fs from 'fs';

import { initializeApp, cert } from 'firebase-admin/app';

import { getFirestore } from 'firebase-admin/firestore';

import serviceAccount from './firebase-key.json' assert { type: 'json' };

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

const url =
    'https://api.github.com/repos/jason-tung/leetcode/commits?per_page=100&page=';

const main = async () => {
    let commits = [];
    for (let i = 1; i <= 3; i++) {
        const iurl = `${url}${i}`;
        console.log('fetching from', iurl);
        const d = await (await fetch(iurl)).json();
        d.forEach((k) => commits.push(k));
        console.log(commits.length);
    }
    commits = commits.filter((k) =>
        k.commit.message.startsWith(
            '[jasbob-leetcode-bot] automated upload of '
        )
    );
    console.log(commits.length);
    commits = commits.map((d) => {
        const title = d.commit.message.replace(
            '[jasbob-leetcode-bot] automated upload of ',
            ''
        );
        return {
            timestamp: d.commit.committer.date,
            formattedTitle: title,
            problem,
        };
    });
    fs.writeFileSync('backpop.json', JSON.stringify(commits, undefined, 4));
    // commits = commits.slice(0, 5);
    for (const commit of commits) {
        const docRef = db.collection('leetcode_actions').doc();
        const doc = {
            formattedTitle: commit.message,
            problemNumber: commit.message.split('-'),
            problemName,
            suffix,
            url,
            action: suffix.length > 0 ? 'write_alt_sol' : 'write_sol',
            rewrite: fileExists,
            timestamp: new Date(),
            difficulty,
        };
        console.log(doc);
        // await docRef.set();
    }
};

main();
