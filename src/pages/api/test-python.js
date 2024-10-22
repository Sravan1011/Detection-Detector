// pages/api/test-python.js
import { spawn } from 'child_process';

export default async function handler(req, res) {
  try {
    const pythonProcess = spawn('python', ['-c', 'print("Hello from Python")']);
    
    let output = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      res.status(200).json({ 
        status: 'success',
        output,
        code 
      });
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
}