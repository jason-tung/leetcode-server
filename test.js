import os from 'os';
import path from 'path';
import {dirname} from 'path'
import fs from 'fs'

const homeDir = os.homedir();
const resourceDir = path.join(homeDir, 'leetcode-server', 'public')


fs.readdir(resourceDir, (err, files) => {
files.forEach(file => {
console.log(file)
})
})