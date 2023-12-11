import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs'
import 'dotenv/config';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

app.get('', (req, res) => res.send('hi'));

app.post('/updateGithub', authenticate, (req, res) => {
    console.log(req.body);
    const {difficulty, formattedTitle, fileText} = req.body
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, 'leetcode', difficulty, `${formattedTitle}.py`);
    fs.writeFile(filePath, fileText,  (err) => {
        if (err) {
          console.error('Error writing file:', err);
        } else {
          console.log('File written successfully.');
        }
      });
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
            exec(`git commit -m "${commitMessage}"`, options, (error, stdout, stderr)=>{
                if (error || stderr){
                    console.error("uh oh stinky 2", error, stderr )
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
                            console.log("omg we uploaded!?!")
                            res.stats(200).send(`uploaded [${difficulty}] ${formattedTitle}`)
                        }
                    })
                }
            })
        }
    })
    
    // exec('echo hello wrld', (error, stdout, stderr) => {
    //     if (error) {
    //         console.error(`Error executing command: ${error.message}`);
    //         return res.status(500).send('Error executing command');
    //     } else if (stderr) {
    //         console.error(`Command error: ${stderr}`);
    //         return res.status(500).send('Command error');
    //     } else {
    //         console.log(`Command output: ${stdout}`);
    //         res.status(200).send('Command executed successfully');
    //     }
    // });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
