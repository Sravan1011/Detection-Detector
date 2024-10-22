// src/components/DefectDetector.js
import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';

const DefectDetector = () => {
  const [mode, setMode] = useState('training');
  const [capturedImage, setCapturedImage] = useState(null);
  const [dataset, setDataset] = useState({ good: [], bad: [] });
  const [isModelTrained, setIsModelTrained] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const webcamRef = useRef(null);

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    // Reset test result when new image is captured
    setTestResult(null);
  };

  const addToDataset = async (label) => {
    if (!capturedImage) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/add_sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          label,
          roi: { x: 0, y: 0, width: 100, height: 100 }
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setDataset(prev => ({
          ...prev,
          [label]: [...prev[label], capturedImage]
        }));
        setCapturedImage(null);
        alert(`Successfully added ${label} sample!`);
      } else {
        throw new Error(data.message || 'Failed to add sample');
      }
    } catch (error) {
      console.error('Error adding sample:', error);
      alert(`Error adding sample: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const trainModel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/train', { method: 'POST' });
      const data = await response.json();
      if (data.status === 'success') {
        setIsModelTrained(true);
        alert(`Model trained successfully! Accuracy: ${(data.accuracy * 100).toFixed(2)}%`);
      } else {
        throw new Error(data.message || 'Training failed');
      }
    } catch (error) {
      console.error('Error training model:', error);
      alert(`Error training model: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testImage = async () => {
    if (!capturedImage) return;
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setTestResult({
          prediction: data.prediction,
          confidence: data.confidence
        });
      } else {
        throw new Error(data.message || 'Detection failed');
      }
    } catch (error) {
      console.error('Error testing image:', error);
      alert(`Error analyzing image: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center mb-8">Defect Detection System</h1>

          {/* Mode Selection */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                onClick={() => {
                  setMode('training');
                  setTestResult(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  mode === 'training'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-200`}
              >
                Training Mode
              </button>
              <button
                onClick={() => {
                  setMode('testing');
                  setTestResult(null);
                }}
                disabled={!isModelTrained}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  mode === 'testing'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-l-0 border-gray-200 ${
                  !isModelTrained && 'opacity-50 cursor-not-allowed'
                }`}
              >
                Testing Mode
              </button>
            </div>
          </div>

          {/* Camera Section */}
          <div className="mb-8">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={captureImage}
                className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Capture Image'}
              </button>
            </div>
          </div>

          {/* Preview Section */}
          {capturedImage && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Captured Image</h2>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Training Mode UI */}
          {mode === 'training' && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Good Samples</h3>
                  <p className="text-2xl text-green-600">{dataset.good.length}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Defect Samples</h3>
                  <p className="text-2xl text-red-600">{dataset.bad.length}</p>
                </div>
              </div>

              {capturedImage && (
                <div className="flex justify-center space-x-4 mb-6">
                  <button
                    onClick={() => addToDataset('good')}
                    className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition-colors"
                    disabled={isLoading}
                  >
                    Add as Good Sample
                  </button>
                  <button
                    onClick={() => addToDataset('bad')}
                    className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition-colors"
                    disabled={isLoading}
                  >
                    Add as Defect Sample
                  </button>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={trainModel}
                  disabled={dataset.good.length === 0 || dataset.bad.length === 0 || isLoading}
                  className={`bg-purple-500 text-white px-8 py-3 rounded-md ${
                    dataset.good.length === 0 || dataset.bad.length === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-purple-600'
                  } transition-colors`}
                >
                  {isLoading ? 'Training...' : 'Train Model'}
                </button>
              </div>
            </div>
          )}

          {/* Testing Mode UI */}
          {mode === 'testing' && (
            <div className="space-y-4">
              {capturedImage && (
                <div className="flex flex-col items-center">
                  <button
                    onClick={testImage}
                    className="bg-blue-500 text-white px-8 py-3 rounded-md hover:bg-blue-600 transition-colors mb-4"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Analyzing...' : 'Analyze Image'}
                  </button>

                  {testResult && (
                    <div className={`w-full max-w-md p-6 rounded-lg ${
                      testResult.prediction === 'good' 
                        ? 'bg-green-100 border-2 border-green-500' 
                        : 'bg-red-100 border-2 border-red-500'
                    }`}>
                      <h3 className="text-xl font-bold mb-2">Analysis Result</h3>
                      <div className="space-y-2">
                        <p className="text-lg">
                          Status: <span className={`font-bold ${
                            testResult.prediction === 'good' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {testResult.prediction === 'good' ? 'No Defects Found' : 'Defect Detected'}
                          </span>
                        </p>
                        <p className="text-md">
                          Confidence: {(testResult.confidence * 100).toFixed(1)}%
                        </p>
                        {testResult.prediction === 'bad' && (
                          <div className="mt-2 p-3 bg-red-50 rounded">
                            <p className="text-red-700">
                              ⚠️ This part appears to have defects and should be inspected.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Testing Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Capture a new image using the camera</li>
                  <li>Click "Analyze Image" to detect defects</li>
                  <li>Review the analysis results and confidence score</li>
                  <li>For defective parts, follow inspection protocols</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DefectDetector;