import sys
import json
import cv2
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import base64
import os
import pickle

class DefectDetector:
   def __init__(self):
       self.model = None
       self.scaler = None
       self.training_data = self.load_training_data()

   def load_training_data(self):
       try:
           with open('training_data.pkl', 'rb') as f:
               return pickle.load(f)
       except:
           return {'good': [], 'bad': []}

   def save_training_data(self):
       with open('training_data.pkl', 'wb') as f:
           pickle.dump(self.training_data, f)

   def extract_features(self, image, roi):
       try:
           x, y, w, h = roi['x'], roi['y'], roi['width'], roi['height']
           roi_img = image[y:y+h, x:x+w]
           gray_roi = cv2.cvtColor(roi_img, cv2.COLOR_BGR2GRAY)
           
           # Extract features
           features = []
           
           # Average intensity
           avg_intensity = np.mean(gray_roi)
           features.append(avg_intensity)
           
           # Standard deviation of intensity
           std_intensity = np.std(gray_roi)
           features.append(std_intensity)
           
           # Simple edge detection features
           edges = cv2.Canny(gray_roi, 100, 200)
           edge_density = np.mean(edges)
           features.append(edge_density)
           
           # Add texture features using GLCM
           texture_features = cv2.Laplacian(gray_roi, cv2.CV_64F).var()
           features.append(texture_features)
           
           # Add histogram features
           hist = cv2.calcHist([gray_roi], [0], None, [32], [0, 256])
           hist = hist.flatten() / hist.sum()  # Normalize histogram
           features.extend(hist)

           return np.array(features)
       except Exception as e:
           print(f"Error in extract_features: {str(e)}")
           raise

   def add_sample(self, image_path, label, roi):
       try:
           # Read image from file
           image = cv2.imread(image_path)
           if image is None:
               raise ValueError(f"Failed to load image from path: {image_path}")
               
           # Extract features
           features = self.extract_features(image, roi)
           
           # Store features
           self.training_data[label].append(features)
           
           # Save updated training data
           self.save_training_data()
           
           return len(self.training_data[label])
       except Exception as e:
           print(f"Error in add_sample: {str(e)}")
           raise

   def train_model(self):
       try:
           if len(self.training_data['good']) == 0 or len(self.training_data['bad']) == 0:
               raise ValueError("Not enough samples to train the model. Need samples from both classes.")

           # Prepare training data
           X_good = np.array(self.training_data['good'])
           X_bad = np.array(self.training_data['bad'])
           X = np.vstack((X_good, X_bad))
           y = np.array(['good'] * len(X_good) + ['bad'] * len(X_bad))

           # Scale features
           self.scaler = StandardScaler()
           X_scaled = self.scaler.fit_transform(X)

           # Train model
           self.model = RandomForestClassifier(
               n_estimators=100,
               max_depth=None,
               min_samples_split=2,
               min_samples_leaf=1,
               random_state=42
           )
           self.model.fit(X_scaled, y)

           # Save the trained model and scaler
           with open('model.pkl', 'wb') as f:
               pickle.dump((self.model, self.scaler), f)

           # Calculate accuracy on training data
           accuracy = self.model.score(X_scaled, y)
           return accuracy

       except Exception as e:
           print(f"Error in train_model: {str(e)}")
           raise

   def predict(self, image_path, roi):
       try:
           if self.model is None or self.scaler is None:
               # Try to load saved model
               try:
                   with open('model.pkl', 'rb') as f:
                       self.model, self.scaler = pickle.load(f)
               except:
                   raise ValueError("Model not trained yet and no saved model found")

           # Read and process image
           image = cv2.imread(image_path)
           if image is None:
               raise ValueError(f"Failed to load image from path: {image_path}")

           # Extract features
           features = self.extract_features(image, roi)
           features_scaled = self.scaler.transform([features])

           # Make prediction
           prediction = self.model.predict(features_scaled)[0]
           confidence = np.max(self.model.predict_proba(features_scaled)[0])

           return prediction, confidence

       except Exception as e:
           print(f"Error in predict: {str(e)}")
           raise

   def get_sample_counts(self):
       return {
           'good': len(self.training_data['good']),
           'bad': len(self.training_data['bad'])
       }

def main():
   try:
       detector = DefectDetector()
       command = sys.argv[1]
       
       if command == 'train':
           accuracy = detector.train_model()
           print(json.dumps({
               "status": "success",
               "accuracy": float(accuracy)
           }))
           
       elif command == 'get_counts':
           counts = detector.get_sample_counts()
           print(json.dumps({
               "status": "success",
               "counts": counts
           }))
           
       else:
           # Commands that require additional data
           if len(sys.argv) < 3:
               raise ValueError(f"Command {command} requires additional data")
               
           data = json.loads(sys.argv[2])
           
           if command == 'add_sample':
               if 'imagePath' not in data or 'label' not in data or 'roi' not in data:
                   raise ValueError("Missing required data for add_sample")
                   
               sample_count = detector.add_sample(
                   data['imagePath'],
                   data['label'],
                   data['roi']
               )
               print(json.dumps({
                   "status": "success",
                   "sample_count": sample_count
               }))
               
           elif command == 'predict':
               if 'imagePath' not in data or 'roi' not in data:
                   raise ValueError("Missing required data for predict")
                   
               prediction, confidence = detector.predict(
                   data['imagePath'],
                   data['roi']
               )
               print(json.dumps({
                   "status": "success",
                   "prediction": prediction,
                   "confidence": float(confidence)
               }))
               
           else:
               raise ValueError(f"Unknown command: {command}")
               
   except Exception as e:
       print(json.dumps({
           "status": "error",
           "message": str(e)
       }))
       sys.exit(1)

if __name__ == "__main__":
   main()