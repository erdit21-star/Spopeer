/**
 * Stories UI Component Handler
 * Creates and manages the stories upload modal
 */
(function () {
  'use strict';

  class StoriesUI {
    constructor() {
      this.currentFiles = [];
      this.isUploading = false;
    }

    /**
     * Create and show stories upload modal
     */
    createUploadModal() {
      const modalId = 'stories-upload-modal-' + Date.now();
      const modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'stories-upload-modal';
      modal.innerHTML = `
        <div class="stories-upload-container">
          <div class="stories-upload-header">
            <h2>Share Your Story</h2>
            <button class="stories-upload-close" aria-label="Close modal">×</button>
          </div>
          
          <div class="stories-upload-content">
            <div class="stories-drop-zone" id="dropZone-${modalId}">
              <div class="stories-drop-icon">📸</div>
              <div class="stories-drop-text">Drag a photo or video here</div>
              <div class="stories-drop-hint">or</div>
              <input 
                type="file" 
                id="fileInput-${modalId}" 
                accept="image/*,video/*"
                style="display: none;"
              />
              <button type="button" class="stories-upload-btn-primary" onclick="document.getElementById('fileInput-${modalId}').click()">
                Choose File
              </button>
              <div class="stories-file-hint">JPG, PNG, GIF (images) or MP4, WebM (videos) • Max 100MB</div>
            </div>

            <div class="stories-form-group" id="previewSection-${modalId}" style="display: none;">
              <img id="preview-${modalId}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;" />
            </div>

            <div class="stories-form-group">
              <label for="caption-${modalId}">Caption (optional)</label>
              <textarea id="caption-${modalId}" placeholder="Add a caption to your story..."></textarea>
            </div>

            <div class="stories-form-group">
              <label for="sport-${modalId}">Sport (optional)</label>
              <select id="sport-${modalId}" class="sport-select">
                <option value="">Select a sport...</option>
              </select>
            </div>
          </div>

          <div class="stories-upload-footer">
            <button type="button" class="stories-upload-btn-cancel" onclick="this.closest('.stories-upload-modal').remove()">Cancel</button>
            <button type="button" class="stories-upload-btn-submit" id="uploadBtn-${modalId}">Share Story</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Setup event listeners
      this.setupUploadEvents(modalId);
      
      // Load sports if available
      if (window.SpopeerSports) {
        window.SpopeerSports.fillSelect(document.getElementById(`sport-${modalId}`), 'Select a sport...');
      }

      return modalId;
    }

    /**
     * Setup upload modal event listeners
     */
    setupUploadEvents(modalId) {
      const dropZone = document.getElementById(`dropZone-${modalId}`);
      const fileInput = document.getElementById(`fileInput-${modalId}`);
      const previewSection = document.getElementById(`previewSection-${modalId}`);
      const preview = document.getElementById(`preview-${modalId}`);
      const uploadBtn = document.getElementById(`uploadBtn-${modalId}`);
      const captionInput = document.getElementById(`caption-${modalId}`);
      const sportInput = document.getElementById(`sport-${modalId}`);
      const modal = document.getElementById(modalId);
      const closeBtn = modal.querySelector('.stories-upload-close');

      let selectedFile = null;

      // Close modal
      closeBtn.addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });

      // File input change
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleFileSelection(e.target.files[0]);
        }
      });

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
        if (e.dataTransfer.files.length > 0) {
          handleFileSelection(e.dataTransfer.files[0]);
        }
      });

      const handleFileSelection = (file) => {
        selectedFile = file;
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
          if (window.SpopeerToast) {
            window.SpopeerToast.error('Please select an image or video');
          }
          return;
        }

        if (file.size > 100 * 1024 * 1024) {
          if (window.SpopeerToast) {
            window.SpopeerToast.error('File size exceeds 100MB limit');
          }
          return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
          if (isVideo) {
            preview.src = '/images/video-placeholder.png'; // Placeholder for video
            preview.alt = 'Video selected';
          } else {
            preview.src = e.target.result;
          }
          previewSection.style.display = 'block';
          dropZone.style.display = 'none';
        };
        reader.readAsDataURL(file);

        uploadBtn.disabled = false;
      };

      // Upload handler
      uploadBtn.addEventListener('click', async () => {
        if (!selectedFile) {
          if (window.SpopeerToast) {
            window.SpopeerToast.warning('Please select a file');
          }
          return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        try {
          await window.storiesManager.uploadStory(
            selectedFile,
            captionInput.value,
            sportInput.value
          );

          modal.remove();

          // Refresh stories if feed is loaded
          if (window.storiesManager.fetchFeedStories) {
            window.storiesManager.fetchFeedStories();
          }
        } catch (err) {
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'Share Story';
        }
      });
    }

    /**
     * Create and return upload button
     */
    createUploadButton() {
      const btn = document.createElement('button');
      btn.className = 'stories-upload-trigger-btn';
      btn.innerHTML = '📖 Share Story';
      btn.style.cssText = `
        padding: 0.75rem 1.5rem;
        background: #001f3f;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
      `;
      btn.addEventListener('click', () => this.createUploadModal());
      btn.addEventListener('mouseenter', () => btn.style.background = '#001a33');
      btn.addEventListener('mouseleave', () => btn.style.background = '#001f3f');
      return btn;
    }
  }

  window.StoriesUI = StoriesUI;
  window.storiesUI = new StoriesUI();
})();
