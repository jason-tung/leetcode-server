import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';

import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import {dirname} from 'path'
import fs from 'fs'
import 'dotenv/config';

const getCurrentTime = () => {
    const currentDate = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));

    const year = currentDate.getFullYear().toString().padStart(4, '0');
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');

    return`${month}/${day}/${year} ${hours}:${minutes}`;
}

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const homeDir = os.homedir();
const resourceDir = path.join(homeDir, 'leetcode-server', 'public')

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

app.get('/images/:item', (req, res) => {
  if (req.params.item == "punch"){
    fs.readFile(path.join(resourceDir, 'punch.png'), (err, data) => {
      if (err) {
        res.status(500).send('Internal Server Error');
        return;
      }
  
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(data);
    })
  }
})

app.get('/', (req, res) => res.send('hi')); 

app.post('/updateGithub', authenticate, (req, res) => {
    console.log(req.body);
    const {difficulty, formattedTitle, fileText} = req.body
    const filePath = path.join(homeDir, 'leetcode', difficulty, `${formattedTitle}.py`);
    fs.writeFile(filePath, fileText,  (err) => {
        if (err) {
          console.error('Error writing file:', err);
        } else {
          console.log('File written successfully.');
          const options = {
            cwd: path.join(homeDir, 'leetcode')
        }
        exec('git add .', options, (error, stdout, stderr)=>{
            if (error || stderr){
                console.error("uh oh stinky 1", error, stderr )
                res.status(500).send('Error executing command');
            }
            else{
                const commitMessage = `[jasbob-leetcode-bot] automated upload of <${difficulty}> ${formattedTitle}`       
                // const commitMessage = `[jasbob-leetcode-bot] what the flip ?`                  
                exec(`git commit -m '${commitMessage}'`, options, (error, stdout, stderr)=>{
                    if (error || stderr){
                        console.error("uh oh stinky 2", stdout, error, stderr )
                        res.status(500).send('Error executing command');
                    }
                    else{
                        exec("git push", options, (error, stdout, stderr)=>{
                            if (error ){
                                // push writes to stderror 
                                console.error("uh oh stinky 3", error )
                                res.status(500).send('Error executing command');
                            }
                            else{
                                const data = {
                                    "embeds": [
                                      {
                                        "fields": [
                                          {
                                            "name": `[jasbob-leetcode-bot] Automated Upload Triggered!`,
                                            "value": `Uploaded <${difficulty}> ${formattedTitle} [(here)](https://github.com/jason-tung/leetcode)`
                                          }
                                        ],
                                        "thumbnail": {
                                          "url": `http://jasontung.me:3001/randomimage?key=${Math.random()}`
                                        },
                                        "footer": {
                                          "text": `powered by jasbob-bot ・ ${getCurrentTime()}`,
                                          "icon_url": "https://avatars.githubusercontent.com/u/153464167?v=4"
                                        }
                                      }
                                    ]
                                  }
                                fetch(process.env.WEBHOOK, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(data)
                                  })
                                console.log("omg we uploaded!?!")
                                res.status(200).send(`${formattedTitle}`)
                            }
                        })
                    }
                })
            }
        })
        }
      });

});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
