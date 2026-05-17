ProfileSyncService.init();

    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    let uploadedImages = [];

    // Load listing if editing
    if (editId) {
      document.getElementById('pageTitle').textContent = 'Edit Listing';
      document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
      loadListingForEdit();
    }

    async function loadListingForEdit() {
      try {
        const listing = await MarketplaceService.getListing(editId);
        
        document.getElementById('title').value = listing.title;
        document.getElementById('description').value = listing.description || '';
        document.getElementById('categorySelect').value = listing.category;
        document.getElementById('price').value = listing.price;
        document.getElementById('priceType').value = listing.price_type;
        document.getElementById('location').value = listing.location || '';
        
        document.querySelector(`input[name="listing_type"][value="${listing.listing_type}"]`).checked = true;
        if (listing.condition) {
          document.querySelector(`input[name="condition"][value="${listing.condition}"]`).checked = true;
        }
        
        if (listing.sport_tags && listing.sport_tags.length > 0) {
          document.getElementById('sportTags').value = listing.sport_tags.join(', ');
        }

        if (listing.images && listing.images.length > 0) {
          uploadedImages = listing.images;
          renderImagePreviews();
        }

        showConditionCard();
      } catch (error) {
        console.error('Error loading listing:', error);
        if (window.SpopeerToast) window.SpopeerToast.error('Could not load listing for editing');
      }
    }

    // Show/hide condition card based on listing type
    document.querySelectorAll('input[name="listing_type"]').forEach(input => {
      input.addEventListener('change', showConditionCard);
    });

    function showConditionCard() {
      const type = document.querySelector('input[name="listing_type"]:checked')?.value;
      document.getElementById('conditionCard').style.display = (type === 'equipment' || type === 'product') ? 'block' : 'none';
      if (type === 'equipment' || type === 'product') {
        document.querySelector('input[name="condition"]')?.setAttribute('required', 'required');
      }
    }

    // Image upload
    const dropzone = document.getElementById('imageDropzone');
    const imageInput = document.getElementById('imageInput');

    dropzone.addEventListener('click', () => imageInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    imageInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
    });

    function handleFiles(files) {
      if (uploadedImages.length + files.length > 8) {
        if (window.SpopeerToast) window.SpopeerToast.warning('Maximum 8 images allowed');
        return;
      }

      Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedImages.push(e.target.result);
          renderImagePreviews();
        };
        reader.readAsDataURL(file);
      });
    }

    function renderImagePreviews() {
      const preview = document.getElementById('imagePreview');
      preview.innerHTML = '';

      uploadedImages.forEach((img, idx) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `
          <img src="${img}" alt="Preview ${idx + 1}">
          <button type="button" class="image-remove-btn" onclick="removeImage(${idx})">
            <i class="fa-solid fa-times"></i>
          </button>
        `;
        preview.appendChild(item);
      });
    }

    function removeImage(idx) {
      uploadedImages.splice(idx, 1);
      renderImagePreviews();
    }

    // Form submission
    document.getElementById('listingForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        category: document.getElementById('categorySelect').value,
        listing_type: document.querySelector('input[name="listing_type"]:checked').value,
        price: parseFloat(document.getElementById('price').value),
        currency: 'EUR',
        price_type: document.getElementById('priceType').value,
        condition: document.querySelector('input[name="condition"]:checked')?.value || null,
        images: uploadedImages,
        sport_tags: document.getElementById('sportTags').value.split(',').map(s => s.trim()).filter(s => s),
        location: document.getElementById('location').value
      };

      document.getElementById('submitBtn').disabled = true;

      try {
        if (editId) {
          await MarketplaceService.updateListing(editId, formData);
          document.getElementById('successText').textContent = 'Listing updated successfully!';
        } else {
          await MarketplaceService.createListing(formData);
          document.getElementById('successText').textContent = 'Listing created successfully!';
        }

        document.getElementById('successMessage').classList.add('show');
        
        setTimeout(() => {
          window.location.href = 'my-listings.html';
        }, 1500);
      } catch (error) {
        console.error('Error:', error);
        if (window.SpopeerToast) window.SpopeerToast.error('Error: ' + error.message);
        document.getElementById('submitBtn').disabled = false;
      }
    });

    // Initialize visibility
    showConditionCard();
