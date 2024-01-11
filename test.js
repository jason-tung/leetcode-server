import os from 'os';
import path from 'path';
import { dirname } from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const homeDir = os.homedir();
const resourceDir = path.join(homeDir, 'leetcode-server', 'public');
const options = {
    cwd: path.join(homeDir, 'leetcode'),
    encoding: 'UTF-8',
};
const r = execSync(`ls -la easy`, options);

console.log(r);

const extractLatestCommit = (s) => {
    return s.match(/(?<=[ \t]+[a-z0-9]+\.\.)[a-z0-9]+/)[0];
};

const sample = `Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 8 threads
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 296 bytes | 296.00 KiB/s, done.
Total 3 (delta 2), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (2/2), completed with 2 local objects.
To github.com:jason-tung/leetcode-archiver.git
   b638a63..5bdec10  main -> main`;

// console.log(extractLatestCommit(sample));
