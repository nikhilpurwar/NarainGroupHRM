from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import base64
from facenet_pytorch import MTCNN, InceptionResnetV1
import torch
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# Initialize face detection and recognition models
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

def base64_to_image(base64_string):
    """Convert base64 string to PIL Image"""
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        return image
    except Exception as e:
        raise ValueError(f"Invalid base64 image: {str(e)}")

def extract_face_embedding(image):
    """Extract face embedding from image using FaceNet"""
    try:
        # Detect faces
        boxes, _ = mtcnn.detect(image)
        
        if boxes is None:
            return None, "No face detected"
        
        # Use the first detected face
        face = mtcnn(image)
        if face is None:
            return None, "Face extraction failed"
        
        # Ensure correct tensor dimensions
        if face.dim() == 3:
            face = face.unsqueeze(0)  # Add batch dimension
        
        # Generate embedding
        face = face.to(device)
        with torch.no_grad():
            embedding = resnet(face).cpu().numpy().flatten()
        
        return embedding.tolist(), None
    except Exception as e:
        return None, f"Face processing error: {str(e)}"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "face-recognition"})

@app.route('/extract-embedding', methods=['POST'])
def extract_embedding():
    """Extract face embedding from base64 image"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({"success": False, "message": "Image data required"}), 400
        
        # Convert base64 to image
        image = base64_to_image(data['image'])
        
        # Extract embedding
        embedding, error = extract_face_embedding(image)
        
        if error:
            return jsonify({"success": False, "message": error}), 400
        
        return jsonify({
            "success": True,
            "embedding": embedding,
            "dimension": len(embedding)
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/compare-faces', methods=['POST'])
def compare_faces():
    """Compare two face embeddings"""
    try:
        data = request.get_json()
        
        if not data or 'embedding1' not in data or 'embedding2' not in data:
            return jsonify({"success": False, "message": "Two embeddings required"}), 400
        
        emb1 = np.array(data['embedding1'])
        emb2 = np.array(data['embedding2'])
        
        # Calculate cosine similarity
        similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        
        return jsonify({
            "success": True,
            "similarity": float(similarity),
            "match": similarity > 0.85
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)