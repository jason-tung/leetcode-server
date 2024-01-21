import fs from 'fs';

import { initializeApp, cert } from 'firebase-admin/app';

import { getFirestore } from 'firebase-admin/firestore';

import serviceAccount from './firebase-key.json' assert { type: 'json' };
import { assert } from 'console';

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

let commits = JSON.parse(fs.readFileSync('backpop.json'));

// a is the shortest
const getSuffix = (a, b) => {
    assert(b.includes(a), `${b} does not include ${a}`);
    return b.replace(a, '');
};

// commits = commits.slice(0, 2);
for (const commit of commits) {
    let doc = {
        ...commit,
        suffix: '',
    };
    const docRef = db.collection('leetcode_actions').doc();
    // timestamp: d.commit.committer.date,
    // formattedTitle,
    // problemNumber,
    // difficulty,
    // rewrite forammted name and formatted title

    // need to calc: suffix, url, action, rewrite
    // check for existence of doc with same problem numer
    // compare to earliest one - if it exists check to see if it's a suffix or re-write
    const subset = commits.filter(
        (k) => k.problemNumber == commit.problemNumber
    );

    const isRewrite =
        commits.filter((k) => k.formattedTitle == commit.formattedTitle)[0]
            .timestamp != commit.timestamp;

    // console.log(commit, isRewrite);

    const shortest = subset.reduce((prev, cur) =>
        prev.formattedTitle.length <= cur.formattedTitle.length ? prev : cur
    );
    const fullTitle = commit.formattedTitle;
    if (shortest.formattedTitle !== fullTitle) {
        const { timestamp: _, ...rest } = shortest;
        doc = { ...doc, ...rest };
    }
    console.assert(doc.timestamp == commit.timestamp);
    let suffix = getSuffix(shortest.formattedTitle, fullTitle);
    if (suffix) {
        suffix = suffix.slice(1);
        doc.suffix = suffix;
        // console.log(`${fullTitle}      ${suffix}`);
    }
    const splitName = shortest.formattedTitle.split('-');
    const problemName = splitName.slice(1).join('-');
    doc = {
        ...doc,
        url: `https://leetcode.com/problems/${problemName}/`,
        action: doc.suffix.length > 0 ? 'write_alt_sol' : 'write_sol',
        rewrite: isRewrite,
        timestamp: new Date(doc.timestamp),
    };

    // console.log(doc);
    await docRef.set(doc);
}
