import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
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
    exec('echo hello wrld', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${error.message}`);
            return res.status(500).send('Error executing command');
        } else if (stderr) {
            console.error(`Command error: ${stderr}`);
            return res.status(500).send('Command error');
        } else {
            console.log(`Command output: ${stdout}`);
            res.status(200).send('Command executed successfully');
        }
    });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
