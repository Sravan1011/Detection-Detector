// src/pages/api/add_sample.js
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { writeFile } from 'fs/promises';

function checkProjectStructure() {
  const projectRoot = process.cwd();
  console.log('Project root:', projectRoot);
  
  const libPath = path.join(projectRoot, 'lib');
  const tempPath = path.join(projectRoot, 'temp');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempPath)) {
    fs.mkdirSync(tempPath, { recursive: true });
  }
  
  console.log('Checking directories and files:');
  console.log('lib directory exists:', fs.existsSync(libPath));
  console.log('Python script exists:', fs.existsSync(path.join(libPath, 'defect_detector.py')));
  
  return {
    pythonScriptPath: path.join(libPath, 'defect_detector.py'),
    tempPath
  };
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { image, label } = req.body;
      
      const { pythonScriptPath, tempPath } = checkProjectStructure();
      
      // Save image to temporary file
      const tempImagePath = path.join(tempPath, `temp_${Date.now()}.jpg`);
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      await writeFile(tempImagePath, base64Data, 'base64');
      
      // Create data object with file path instead of base64 string
      const data = {
        imagePath: tempImagePath,
        label,
        roi: { x: 0, y: 0, width: 100, height: 100 }
      };

      const pythonExe = 'C:\\Users\\srava\\AppData\\Local\\Programs\\Python\\Python311\\python.exe';
      
      const pythonProcess = spawn(pythonExe, [
        pythonScriptPath,
        'add_sample',
        JSON.stringify(data)
      ]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempImagePath);
        } catch (err) {
          console.error('Error deleting temporary file:', err);
        }

        if (code === 0) {
          try {
            const result = JSON.parse(outputData);
            res.status(200).json(result);
          } catch (error) {
            res.status(500).json({ 
              status: 'error', 
              message: 'Failed to parse Python output',
              error: error.message
            });
          }
        } else {
          res.status(500).json({ 
            status: 'error', 
            message: 'Python script execution failed',
            error: errorData
          });
        }
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