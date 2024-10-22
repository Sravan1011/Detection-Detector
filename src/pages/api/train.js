// src/pages/api/train.js
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

function checkProjectStructure() {
  const projectRoot = process.cwd();
  console.log('Project root:', projectRoot);
  
  const libPath = path.join(projectRoot, 'lib');
  const pythonScriptPath = path.join(libPath, 'defect_detector.py');
  
  console.log('Checking directories and files:');
  console.log('lib directory exists:', fs.existsSync(libPath));
  console.log('Python script exists:', fs.existsSync(pythonScriptPath));
  
  try {
    fs.accessSync(pythonScriptPath, fs.constants.R_OK);
    console.log('File is readable');
  } catch (err) {
    console.error('File is not readable', err);
  }

  return pythonScriptPath;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const pythonScriptPath = checkProjectStructure();
      
      // Create empty data object for training
      const trainData = { command: 'train' };

      const pythonProcess = spawn('C:\\Users\\srava\\AppData\\Local\\Programs\\Python\\Python311\\python.exe', [
        pythonScriptPath,
        'train',
        JSON.stringify(trainData)  // Pass empty data object
      ]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
        console.log('Python stdout:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(outputData);
            res.status(200).json({ 
              status: 'success', 
              message: 'Model trained successfully',
              accuracy: result.accuracy 
            });
          } catch (error) {
            console.error('Error parsing Python output:', error);
            res.status(500).json({ 
              status: 'error', 
              message: 'Failed to parse training result',
              error: error.message,
              output: outputData
            });
          }
        } else {
          console.error('Python process exited with code:', code);
          res.status(500).json({ 
            status: 'error', 
            message: 'Failed to train model',
            error: errorData || 'Unknown error occurred'
          });
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to start Python process',
          error: error.message
        });
      });

    } catch (error) {
      console.error('Error in API route:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Internal server error',
        error: error.message
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}