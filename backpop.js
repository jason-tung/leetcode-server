import fetch from 'node-fetch';
import fs from 'fs';

const url =
    'https://api.github.com/repos/jason-tung/leetcode/commits?per_page=100&page=';

const main = async () => {
    let commits = [];
    for (let i = 1; i <= 3; i++) {
        const iurl = `${url}${i}`;
        console.log('fetching from', iurl);
        const d = await (
            await fetch(iurl, {
                headers: { Authorization: `${process.env.GHTOKEN}` },
            })
        ).json();
        // console.log(d);
        d.forEach((k) => commits.push(k));
        console.log(commits.length);
    }
    commits = commits.filter(
        (k) =>
            k.commit.message.startsWith(
                '[jasbob-leetcode-bot] automated upload of <'
            ) && !k.commit.message.includes('--')
    );
    console.log(commits.length);
    commits = commits.map((d) => {
        const title = d.commit.message.replace(
            '[jasbob-leetcode-bot] automated upload of ',
            ''
        );
        const split = title.split(' ');
        const difficulty = split[0].replace(/[<>]/g, '');
        const formattedTitle = split[1];
        const splitName = formattedTitle.split('-');
        const problemNumber = splitName[0];
        const problemName = splitName
            .slice(1)
            .join(' ')
            .replace(/^\w|\s\w/g, (x) => x.toUpperCase());
        return {
            timestamp: d.commit.committer.date,
            formattedTitle,
            problemNumber,
            problemName,
            difficulty,
        };
    });
    commits = commits.filter((k) => {
        return (
            !/[^a-zA-Z0-9\-]/.test(k.formattedTitle) &&
            k.problemNumber !== '99999'
        );
    });
    commits = commits.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    console.log(commits.length);
    console.log(commits.at(0));
    fs.writeFileSync('backpop.json', JSON.stringify(commits, undefined, 4));
};

main();
