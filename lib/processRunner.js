const { spawn } = require('child_process');
const path = require('path');

module.exports.runInference = (configPath, outputDir) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../inference.py'),
      '--ckpt_dir', 'checkpoints/lora/slides',
      '--sample_list', configPath,
      '--output_dir', outputDir
    ]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Process exited with code ${code}\n${stderr}`));
      }
      resolve(stdout);
    });
  });
};