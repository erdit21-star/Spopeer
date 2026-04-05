// Updated
/**
 * Gallery Upload Manager
 * Handles photo and video uploads for user profiles
 * NOTE: Media storage is currently in-memory on the server (non-persistent).
 * Uploads will be lost on server restart until a database-backed media model is added.
 */

class GalleryManager {
  constructor(_options = {}) {
    this.currentUser = this.parseUser();
    this.uploading = false;
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  }

  parseUser() {
    const userStr = localStorage.getItem('spopeer_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isImage(file) {
    return file.type.startsWith('image/');
  }

  isVideo(file) {
    return file.type.startsWith('video/');
  }

  validateFile(file) {
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed. Please upload an image or video.');
    }
    if (file.size > this.maxFileSize) {
      throw new Error('File size exceeds 100MB limit.');
    }
    return true;
  }

  async uploadMedia(file, caption = '') {
    if (!this.currentUser) {
      alert('Please log in to upload media');
      return null;
    }

    try {
      this.validateFile(file);
      this.uploading = true;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      this.uploading = false;
      return result;
    } catch (err) {
      this.uploading = false;
      throw err;
    }
  }

  async getUserMedia(userId) {
    try {
      const response = await fetch(`/api/media/user/${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      console.error('Error fetching media:', err);
    }
    return [];
  }

  async deleteMedia(mediaId) {
    if (!this.currentUser) return false;

    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        return true;
      }
    } catch (err) {
      console.error('Error deleting media:', err);
    }
    return false;
  }

  async updateCaption(mediaId, caption) {
    if (!this.currentUser) return false;

    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ caption })
      });

      if (response.ok) {
        return true;
      }
    } catch (err) {
      console.error('Error updating caption:', err);
    }
    return false;
  }

  isLoggedIn() {
    return !!this.token && !!this.currentUser;
  }

  isOwnProfile(userId) {
    return this.currentUser && String(this.currentUser.id) === String(userId);
  }
}

// Create global instance
const galleryManager = new GalleryManager();

// Helper function to create gallery upload modal — called from HTML pages
function createGalleryUploadModal() { // eslint-disable-line no-unused-vars
  const modalId = 'gallery-upload-modal-' + Date.now();
  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'gallery-upload-modal';
  modal.innerHTML = `
    <div class="gallery-upload-overlay"></div>
    <div class="gallery-upload-container">
      <div class="gallery-upload-header">
        <h2>Upload Photo or Video</h2>
        <button class="gallery-upload-close" onclick="document.getElementById('${modalId}').remove()">×</button>
      </div>
      
      <div class="gallery-upload-content">
        <div class="gallery-drop-zone" id="dropZone-${modalId}">
          <div class="gallery-drop-icon">📸</div>
          <div class="gallery-drop-text">Drag photos or videos here</div>
          <div class="gallery-drop-hint">or</div>
          <input 
            type="file" 
            id="fileInput-${modalId}" 
            accept="image/*,video/*" 
            multiple
            style="display: none;"
          />
          <button class="gallery-upload-btn-primary" onclick="document.getElementById('fileInput-${modalId}').click()">
            Choose Files
          </button>
          <div class="gallery-file-hint">JPG, PNG, GIF, WebP (images) or MP4, WebM (videos) • Max 100MB each</div>
        </div>

        <div class="gallery-preview-section" id="previewSection-${modalId}" style="display: none;">
          <h3>Uploads</h3>
          <div class="gallery-preview-list" id="previewList-${modalId}"></div>
        </div>
      </div>

      <div class="gallery-upload-footer">
        <button class="gallery-upload-btn-cancel" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
        <button class="gallery-upload-btn-submit" id="uploadBtn-${modalId}" disabled>Upload</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Setup event listeners
  setupGalleryUploadEvents(modalId);
  return modalId;
}

function setupGalleryUploadEvents(modalId) {
  const dropZone = document.getElementById(`dropZone-${modalId}`);
  const fileInput = document.getElementById(`fileInput-${modalId}`);
  const previewSection = document.getElementById(`previewSection-${modalId}`);
  const previewList = document.getElementById(`previewList-${modalId}`);
  const uploadBtn = document.getElementById(`uploadBtn-${modalId}`);
  
  let selectedFiles = [];

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    selectedFiles = Array.from(files).filter(file => {
      try {
        galleryManager.validateFile(file);
        return true;
      } catch (err) {
        alert(`${file.name}: ${err.message}`);
        return false;
      }
    });

    if (selectedFiles.length === 0) return;

    previewList.innerHTML = '';
    previewSection.style.display = 'block';
    uploadBtn.disabled = false;

    selectedFiles.forEach((file, index) => {
      const preview = createMediaPreview(file, index, modalId);
      previewList.appendChild(preview);
    });
  }

  function createMediaPreview(file, index, _modalId) {
    const item = document.createElement('div');
    item.className = 'gallery-preview-item';
    
    const isImage = galleryManager.isImage(file);
    const type = isImage ? '📷' : '🎬';
    const url = URL.createObjectURL(file);

    item.innerHTML = `
      <div class="gallery-preview-thumbnail" style="background-image: url('${url}');">
        <div class="gallery-preview-badge">${type}</div>
      </div>
      <div class="gallery-preview-info">
        <div class="gallery-preview-filename">${file.name}</div>
        <div class="gallery-preview-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
        <input 
          type="text" 
          class="gallery-preview-caption" 
          placeholder="Add a caption (optional)" 
          data-index="${index}"
        />
      </div>
      <button class="gallery-preview-remove" onclick="this.parentElement.remove(); updateUploadBtn();">×</button>
    `;

    return item;
  }

  window.updateUploadBtn = function() {
    const previews = previewList.querySelectorAll('.gallery-preview-item');
    uploadBtn.disabled = previews.length === 0;
  };

  uploadBtn.addEventListener('click', async () => {
    const previews = previewList.querySelectorAll('.gallery-preview-item');
    if (previews.length === 0) return;

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const caption = previews[i]?.querySelector('.gallery-preview-caption')?.value || '';

      try {
        await galleryManager.uploadMedia(file, caption);
      } catch (err) {
        alert(`Upload failed for ${file.name}: ${err.message}`);
      }
    }

    uploadBtn.textContent = 'Upload';
    alert('Upload complete!');
    document.getElementById(modalId).remove();
    
    // Trigger refresh if callback exists
    if (window.onGalleryUploadComplete) {
      window.onGalleryUploadComplete();
    }
  });
}

// Helper to render gallery grid — called from HTML pages
function renderGalleryGrid(media, options = {}) { // eslint-disable-line no-unused-vars
  const container = document.createElement('div');
  container.className = 'gallery-grid';

  if (!media || media.length === 0) {
    container.innerHTML = '<div class="gallery-empty" style="grid-column: 1/-1; text-align: center; padding: 48px 24px; color: #536471;">No media yet</div>';
    return container;
  }

  media.forEach(item => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    
    const isVideo = item.type === 'video';
    const thumb = isVideo ? '🎬' : '📷';

    card.innerHTML = `
      <div class="gallery-card-media" style="background-image: url('${item.filePath}');">
        <div class="gallery-card-badge">${thumb}</div>
        ${options.canDelete ? `<button class="gallery-card-delete" onclick="deleteMediaItem(${item.id})">×</button>` : ''}
      </div>
      ${item.caption ? `<div class="gallery-card-caption">${item.caption}</div>` : ''}
    `;

    container.appendChild(card);
  });

  return container;
}

// Helper to delete media
window.deleteMediaItem = async function(mediaId) {
  if (!confirm('Delete this media?')) return;
  
  const success = await galleryManager.deleteMedia(mediaId);
  if (success) {
    alert('Media deleted');
    if (window.onGalleryUploadComplete) {
      window.onGalleryUploadComplete();
    }
  } else {
    alert('Failed to delete media');
  }
};

