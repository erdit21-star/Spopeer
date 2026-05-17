(function () {
      const card = document.querySelector('.spm-passport');
      if (!card) return;

      const samples = [
        {
          title: 'Sports Passport',
          badge: 'Athlete Track',
          fields: [
            { label: 'Role', value: 'Athlete' },
            { label: 'Sport', value: 'Football' },
            { label: 'Level', value: 'U21 Elite' },
            { label: 'Status', value: 'Match Ready' }
          ]
        },
        {
          title: 'Sports Passport',
          badge: 'Coach Track',
          fields: [
            { label: 'Role', value: 'Coach' },
            { label: 'Sport', value: 'Basketball' },
            { label: 'Style', value: 'High Press' },
            { label: 'Status', value: 'Scouting Open' }
          ]
        },
        {
          title: 'Sports Passport',
          badge: 'Club Track',
          fields: [
            { label: 'Role', value: 'Club' },
            { label: 'Region', value: 'Europe' },
            { label: 'Focus', value: 'Youth Academy' },
            { label: 'Status', value: 'Trials Live' }
          ]
        },
        {
          title: 'Sports Passport',
          badge: 'Pro Track',
          fields: [
            { label: 'Role', value: 'Professional' },
            { label: 'Field', value: 'Sports Physio' },
            { label: 'Focus', value: 'Recovery' },
            { label: 'Status', value: 'Available' }
          ]
        }
      ];

      const titleNode = document.getElementById('spmPassportTitle');
      const badgeNode = document.getElementById('spmPassportBadge');
      const labels = [
        document.getElementById('spmPassportLabel1'),
        document.getElementById('spmPassportLabel2'),
        document.getElementById('spmPassportLabel3'),
        document.getElementById('spmPassportLabel4')
      ];
      const values = [
        document.getElementById('spmPassportValue1'),
        document.getElementById('spmPassportValue2'),
        document.getElementById('spmPassportValue3'),
        document.getElementById('spmPassportValue4')
      ];

      let idx = 0;

      function renderSample(sample) {
        if (!sample) return;
        titleNode.textContent = sample.title;
        badgeNode.innerHTML = '<i class="fa-solid fa-earth-europe"></i> ' + sample.badge;
        sample.fields.forEach(function (field, i) {
          if (!labels[i] || !values[i]) return;
          labels[i].textContent = field.label;
          values[i].textContent = field.value;
        });
      }

      function rotate() {
        idx = (idx + 1) % samples.length;
        card.classList.add('spm-passport-shift');
        setTimeout(function () {
          renderSample(samples[idx]);
          card.classList.remove('spm-passport-shift');
        }, 170);
      }

      renderSample(samples[0]);

      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setInterval(rotate, 2800);
      }
    })();
