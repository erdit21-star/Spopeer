document.querySelectorAll('.faq-question').forEach(button => {
      button.addEventListener('click', () => {
        const faqItem = button.parentElement;
        const isActive = faqItem.classList.contains('active');
        
        // Close all other items
        document.querySelectorAll('.faq-item.active').forEach(item => {
          if (item !== faqItem) {
            item.classList.remove('active');
          }
        });

        // Toggle current item
        faqItem.classList.toggle('active');
      });
    });
